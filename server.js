import express from "express";
import fs from "fs";
import path from "path";
import os from "os";
import https from "https";
import http from "http";
import archiver from "archiver";

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

function download(url, dest) {
    const proto = url.startsWith("https") ? https : http;

    return new Promise((resolve, reject) => {
        proto.get(url, res => {
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }
            const file = fs.createWriteStream(dest);
            res.pipe(file);
            file.on("finish", () => file.close(resolve));
        }).on("error", reject);
    });
}

app.post("/download", async (req, res) => {
    const input = req.body.images;
    if (!input) {
        return res.status(400).send("No input provided");
    }

    const lines = input
        .split("\n")
        .map(l => l.trim())
        .filter(Boolean);

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "imgzip-"));

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=images.zip");

    const archive = archiver("zip");
    archive.pipe(res);

    try {
        for (const line of lines) {
            const [filename, url] = line.split(";");
            if (!filename || !url) continue;

            const filePath = path.join(tempDir, filename);
            await download(url, filePath);
            archive.file(filePath, { name: filename });
        }

        await archive.finalize();
    } catch (err) {
        console.error(err);
        res.status(500).end();
    } finally {
        // cleanup
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

app.listen(3000, () =>
    console.log("Running on http://localhost:3000")
);

