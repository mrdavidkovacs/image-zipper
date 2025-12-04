import express from "express";
import fs from "fs";
import path from "path";
import os from "os";
import https from "https";
import http from "http";
import archiver from "archiver";

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

const jobs = new Map();

function download(url, dest, signal) {
    const proto = url.startsWith("https") ? https : http;

    return new Promise((resolve, reject) => {
        const req = proto.get(url, res => {
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }
            const file = fs.createWriteStream(dest);
            res.pipe(file);
            file.on("finish", () => file.close(resolve));
        });

        signal.addEventListener("abort", () => {
            req.destroy();
            reject(new Error("aborted"));
        });

        req.on("error", reject);
    });
}

app.get("/progress/:id", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    jobs.set(req.params.id, res);

    req.on("close", () => jobs.delete(req.params.id));
});

app.post("/cancel/:id", (req, res) => {
    const job = jobs.get(req.params.id);
    if (job?.controller) {
        job.controller.abort();
    }
    res.sendStatus(200);
});

app.post("/download", async (req, res) => {
    const jobId = crypto.randomUUID();
    const lines = req.body.images.split("\n").filter(Boolean);

    res.json({ jobId });

    const controller = new AbortController();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "imgzip-"));

    const progress = msg => {
        const client = jobs.get(jobId);
        client?.write(`data: ${JSON.stringify(msg)}\n\n`);
    };

    const client = jobs.get(jobId);
    if (client) client.controller = controller;

    try {
        progress({ type: "start", total: lines.length });

        const zipPath = path.join(tempDir, "images.zip");
        const output = fs.createWriteStream(zipPath);
        const archive = archiver("zip");

        archive.pipe(output);

        let count = 0;
        for (const line of lines) {
            if (controller.signal.aborted) break;

            const [name, url] = line.split(";");
            if (!name || !url) continue;

            const filePath = path.join(tempDir, name);
            await download(url, filePath, controller.signal);
            archive.file(filePath, { name });

            count++;
            progress({ type: "file", current: count, total: lines.length });
        }

        progress({ type: "zip" });
        await archive.finalize();

        progress({ type: "done" });
        client?.end();

    } catch (err) {
        console.error(err);
        progress({ type: "error" });
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
        jobs.delete(jobId);
    }
});

app.listen(3000, () =>
    console.log("Running on http://localhost:3000")
);
