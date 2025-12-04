import express from "express";
import fs from "fs";
import path from "path";
import os from "os";
import https from "https";
import http from "http";
import archiver from "archiver";
import crypto from "crypto";

const app = express();
app.use(express.json());
app.use(express.static("public"));

const jobs = new Map();

function download(url, dest, signal) {
    const proto = url.startsWith("https") ? https : http;
    return new Promise((resolve, reject) => {
        const req = proto.get(url, res => {
            if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
            const file = fs.createWriteStream(dest);
            res.pipe(file);
            file.on("finish", () => file.close(resolve));
        });
        signal?.addEventListener("abort", () => {
            req.destroy();
            reject(new Error("aborted"));
        });
        req.on("error", reject);
    });
}

app.post("/job", (req, res) => {
    const id = crypto.randomUUID();
    jobs.set(id, {
        lines: req.body.images.split("\n").filter(Boolean),
        controller: new AbortController(),
        clients: []
    });
    res.json({ id });
});

app.get("/progress/:id", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const job = jobs.get(req.params.id);
    if (!job) return res.end();

    job.clients.push(res);
    req.on("close", () => { job.clients = job.clients.filter(c => c !== res); });
});

app.post("/cancel/:id", (req, res) => {
    jobs.get(req.params.id)?.controller.abort();
    res.sendStatus(200);
});

app.get("/download/:id", async (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) return res.sendStatus(404);

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "zip-"));
    let done = 0;

    const send = msg => job.clients.forEach(c => c.write(`data: ${JSON.stringify(msg)}\n\n`));

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=images.zip");

    const archive = archiver("zip");
    archive.pipe(res);

    try {
        send({ type: "start", total: job.lines.length });
        const start = Date.now();

        for (const line of job.lines) {
            if (job.controller.signal.aborted) break;

            const [name, url] = line.split(";");
            if (!name || !url) continue;

            const target = path.join(tempDir, name);
            const t0 = Date.now();
            await download(url, target, job.controller.signal);
            done++;
            const avgMs = (Date.now() - start) / done;
            send({ type: "file", done, total: job.lines.length, avgMs });

            archive.file(target, { name });
        }

        send({ type: "zip" });
        await archive.finalize();
        send({ type: "done" });

    } catch (e) {
        send({ type: "error" });
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
        jobs.delete(req.params.id);
    }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
