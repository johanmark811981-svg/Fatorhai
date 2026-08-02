var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var archiver = __toESM(require("archiver"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_googleapis = require("googleapis");
var import_google_auth_library = require("google-auth-library");
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "25mb" }));
  app.use(import_express.default.urlencoded({ extended: true, limit: "25mb" }));
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.get("/api/download-source-zip", (req, res) => {
    try {
      res.attachment("fawateery-app-source.zip");
      const createArchive = archiver.default || archiver;
      const archive = createArchive("zip", {
        zlib: { level: 9 }
      });
      archive.on("error", (err) => {
        console.error("Archive error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: err.message });
        }
      });
      archive.pipe(res);
      const rootDir = process.cwd();
      const filesToInclude = [
        "src",
        "public",
        "index.html",
        "package.json",
        "server.ts",
        "vite.config.ts",
        "tsconfig.json",
        "tsconfig.node.json",
        "capacitor.config.json",
        "metadata.json"
      ];
      filesToInclude.forEach((item) => {
        const fullPath = import_path.default.join(rootDir, item);
        if (import_fs.default.existsSync(fullPath)) {
          const stats = import_fs.default.statSync(fullPath);
          if (stats.isDirectory()) {
            archive.directory(fullPath, item);
          } else if (stats.isFile()) {
            archive.file(fullPath, { name: item });
          }
        }
      });
      archive.finalize();
    } catch (err) {
      console.error("Error creating source ZIP:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0646\u0634\u0627\u0621 \u0645\u0644\u0641 \u0627\u0644\u0640 ZIP \u0644\u0644\u0645\u0634\u0631\u0648\u0639" });
      }
    }
  });
  app.post("/api/backup/upload-to-drive", async (req, res) => {
    try {
      const { data } = req.body;
      if (!data) {
        return res.status(400).json({ error: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0632\u0648\u064A\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629" });
      }
      const auth = new import_google_auth_library.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/drive.file"]
      });
      const client = await auth.getClient();
      const drive = import_googleapis.google.drive({ version: "v3", auth: client });
      const fileMetadata = {
        name: `financial-backup-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`,
        mimeType: "application/json"
      };
      const media = {
        mimeType: "application/json",
        body: JSON.stringify(data, null, 2)
      };
      const response = await drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: "id"
      });
      return res.json({ success: true, fileId: response.data.id });
    } catch (err) {
      console.error("Error uploading to Google Drive:", err);
      let errorMessage = err.message || "\u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641";
      let isApiDisabled = false;
      if (errorMessage.includes("Google Drive API has not been used in project") || errorMessage.includes("disabled")) {
        isApiDisabled = true;
        errorMessage = "\u064A\u062C\u0628 \u062A\u0641\u0639\u064A\u0644 Google Drive API \u0644\u0645\u0634\u0631\u0648\u0639\u0643. \u064A\u0631\u062C\u0649 \u0632\u064A\u0627\u0631\u0629 \u0627\u0644\u0631\u0627\u0628\u0637 \u0627\u0644\u062A\u0627\u0644\u064A \u0644\u062A\u0641\u0639\u064A\u0644\u0647: https://console.developers.google.com/apis/api/drive.googleapis.com/overview";
      }
      const statusCode = err.status || err.code || err.response && err.response.status || 500;
      const finalStatus = typeof statusCode === "number" ? statusCode : 500;
      return res.status(finalStatus).json({
        error: isApiDisabled ? "API_DISABLED" : "DRIVE_ERROR",
        message: isApiDisabled ? "\u064A\u062C\u0628 \u062A\u0641\u0639\u064A\u0644 Google Drive API \u0644\u0644\u0645\u0634\u0631\u0648\u0639." : "\u0641\u0634\u0644 \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 Google Drive. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u0640 API \u0648\u0645\u0646\u062D \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0627\u062A.",
        details: errorMessage,
        link: "https://console.developers.google.com/apis/api/drive.googleapis.com/overview"
      });
    }
  });
  app.post("/api/analyze-debt-document", async (req, res) => {
    try {
      const { fileBase64, mimeType } = req.body;
      if (!fileBase64) {
        return res.status(400).json({ error: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0632\u0648\u064A\u062F \u0627\u0644\u0645\u0644\u0641 \u0644\u0644\u062A\u062D\u0644\u064A\u0644" });
      }
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "\u0645\u0641\u062A\u0627\u062D GEMINI_API_KEY \u063A\u064A\u0631 \u0645\u0647\u064A\u0623 \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0641\u062A\u0627\u062D \u0641\u064A \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A."
        });
      }
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const promptText = `\u0623\u0646\u062A \u062E\u0628\u064A\u0631 \u0645\u062D\u062A\u0631\u0641 \u0641\u064A \u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629\u060C \u0627\u0644\u0639\u0642\u0648\u062F\u060C \u0643\u0634\u0648\u0641\u0627\u062A \u0627\u0644\u062F\u064A\u0648\u0646\u060C \u0648\u0627\u0644\u0633\u0644\u0641.
\u0642\u0645\u062A \u0628\u0631\u0641\u0639 \u0645\u0633\u062A\u0646\u062F (\u0635\u0648\u0631\u0629 \u0623\u0648 \u0645\u0644\u0641 PDF) \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0642\u0648\u0627\u0626\u0645 \u0623\u0648 \u0633\u0644\u0641 \u0623\u0648 \u062F\u064A\u0648\u0646 \u0634\u062E\u0635\u064A\u0629/\u062A\u062C\u0627\u0631\u064A\u0629.
\u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0643\u0627\u0641\u0629 \u0623\u0633\u0637\u0631 \u0648\u0628\u0646\u0648\u062F \u0627\u0644\u062F\u064A\u0648\u0646 \u0648\u0627\u0644\u0633\u0644\u0641 \u0628\u062F\u0642\u0629 \u0641\u0627\u0626\u0642\u0629.

\u0644\u0643\u0644 \u062F\u064A\u0646/\u0633\u0644\u0641\u0629 \u0627\u0633\u062A\u062E\u0631\u062C \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u0627\u0644\u064A\u0629 \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0628\u062A\u0646\u0633\u064A\u0642 \u0645\u0635\u0641\u0648\u0641\u0629 JSON \u0641\u0642\u0637:
- personName: \u0627\u0633\u0645 \u0627\u0644\u0634\u062E\u0635 \u0623\u0648 \u0627\u0644\u062C\u0647\u0629 \u0627\u0644\u062F\u0627\u0626\u0646\u0629/\u0627\u0644\u0645\u062F\u064A\u0646\u0629 (String)
- amount: \u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A \u0628\u0627\u0644\u0623\u0631\u0642\u0627\u0645 \u0641\u0642\u0637 \u0628\u062F\u0648\u0646 \u0631\u0645\u0632 \u0639\u0645\u0644\u0629 (Number)
- currency: \u0646\u0648\u0639 \u0627\u0644\u0639\u0645\u0644\u0629 \u0627\u0644\u0645\u0630\u0643\u0648\u0631\u0629 \u0641\u064A \u0627\u0644\u0645\u0633\u062A\u0646\u062F \u0623\u0648 \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A. \u0627\u0628\u062D\u062B \u0628\u0630\u0643\u0627\u0621 \u0639\u0646 \u0643\u0644\u0645\u0627\u062A \u0645\u062B\u0644 ("\u062F\u0648\u0644\u0627\u0631", "$", "USD") \u0648\u0627\u062C\u0639\u0644 \u0642\u064A\u0645\u062A\u0647\u0627 "$"\u060C \u0623\u0648 ("\u0631\u064A\u0627\u0644", "\u0631.\u0633", "SAR") \u0648\u0627\u062C\u0639\u0644 \u0642\u064A\u0645\u062A\u0647\u0627 "\u0631.\u0633"\u060C \u0648\u0625\u0646 \u0643\u0627\u0646\u062A \u0639\u0645\u0644\u0629 \u0623\u062E\u0631\u0649 \u0643\u062A\u0645 "AED", "EGP", "KWD" \u0627\u0643\u062A\u0628 \u0631\u0645\u0632\u0647\u0627\u060C \u0648\u0625\u0646 \u0644\u0645 \u062A\u064F\u062D\u062F\u062F \u0627\u0639\u062A\u0628\u0631\u0647\u0627 "\u0631.\u0633" (String)
- type: \u0627\u062E\u062A\u0631 \u0628\u062F\u0642\u0629 \u0625\u0645\u0627 "owed_to_me" (\u0625\u0630\u0627 \u0643\u0627\u0646 \u0627\u0644\u0645\u0628\u0644\u063A \u0645\u0633\u062A\u062D\u0642 \u0644\u064A/\u0633\u0644\u0641\u0629 \u0623\u0639\u0637\u064A\u062A\u0647\u0627 \u0644\u0623\u062D\u062F) \u0623\u0648 "i_owe" (\u0625\u0630\u0627 \u0643\u0627\u0646 \u062F\u064A\u0646 \u0639\u0644\u064A/\u0627\u0644\u062A\u0632\u0627\u0645 \u0648\u0627\u062C\u0628 \u0639\u0644\u064A \u0633\u062F\u0627\u062F\u0647)
- phone: \u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u0625\u0630\u0627 \u0643\u0627\u0646 \u0645\u0648\u062C\u0648\u062F\u0627\u064B\u060C \u0623\u0648 null
- dueDate: \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0633\u062A\u062D\u0642\u0627\u0642 \u0628\u062A\u0646\u0633\u064A\u0642 YYYY-MM-DD \u0625\u0630\u0627 \u0643\u0627\u0646 \u0645\u0648\u062C\u0648\u062F\u0627\u064B\u060C \u0623\u0648 null
- notes: \u062A\u0641\u0627\u0635\u064A\u0644 \u0623\u0648 \u0633\u0628\u0628 \u0627\u0644\u062F\u064A\u0646\u060C \u0623\u0648 null

\u0627\u0644\u0645\u062E\u0631\u062C\u0627\u062A \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0645\u0635\u0641\u0648\u0641\u0629 JSON \u0641\u0642\u0637 \u0628\u0627\u0644\u0634\u0643\u0644 \u0627\u0644\u062A\u0627\u0644\u064A \u062F\u0648\u0646 \u0623\u064A \u0646\u0635\u0648\u0635 \u0625\u0636\u0627\u0641\u064A\u0629:
[
  {
    "personName": "\u0645\u062D\u0645\u062F \u0639\u0644\u064A",
    "amount": 1500,
    "currency": "\u0631.\u0633",
    "type": "owed_to_me",
    "phone": "0501234567",
    "dueDate": "2026-09-01",
    "notes": "\u0633\u0644\u0641\u0629 \u0634\u0631\u0627\u0621 \u0628\u0636\u0627\u0639\u0629"
  },
  {
    "personName": "\u062C\u0648\u0646 \u0633\u0645\u064A\u062B",
    "amount": 250,
    "currency": "$",
    "type": "i_owe",
    "phone": null,
    "dueDate": null,
    "notes": "\u062F\u064A\u0646 \u0628\u0627\u0644\u062F\u0648\u0644\u0627\u0631"
  }
]`;
      const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, "");
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || "image/jpeg",
                  data: cleanBase64
                }
              },
              {
                text: promptText
              }
            ]
          }
        ]
      });
      const responseText = response.text || "";
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsedDebts = JSON.parse(jsonMatch[0]);
        return res.json({ success: true, debts: parsedDebts });
      } else {
        return res.status(422).json({
          error: "\u0644\u0645 \u064A\u062A\u0633\u0646\u0651 \u0642\u0631\u0627\u0621\u0629 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062F\u064A\u0648\u0646 \u0628\u0634\u0643\u0644 \u0645\u0647\u064A\u0643\u0644 \u0645\u0646 \u0647\u0630\u0627 \u0627\u0644\u0645\u0644\u0641.",
          raw: responseText
        });
      }
    } catch (err) {
      console.error("Error analyzing debt document:", err);
      return res.status(500).json({
        error: err?.message || "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0645\u0639\u0627\u0644\u062C\u0629 \u0648\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0645\u0644\u0641 \u0628\u0648\u0633\u0627\u0637\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A."
      });
    }
  });
  app.post("/api/parse-voice-input", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0632\u0648\u064A\u062F \u0627\u0644\u0646\u0635 \u0644\u0644\u062A\u062D\u0644\u064A\u0644" });
      }
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "\u0645\u0641\u062A\u0627\u062D GEMINI_API_KEY \u063A\u064A\u0631 \u0645\u0647\u064A\u0623 \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645."
        });
      }
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const promptText = `\u0623\u0646\u062A \u0645\u0633\u0627\u0639\u062F \u0645\u0627\u0644\u064A \u0648\u0645\u062D\u0627\u0633\u0628\u064A \u0630\u0643\u064A \u062C\u062F\u0627\u064B. \u0645\u0647\u0645\u062A\u0643 \u0647\u064A \u062A\u062D\u0644\u064A\u0644 \u0648\u0641\u0647\u0645 \u0646\u0635\u0648\u0635 \u0645\u0633\u062C\u0644\u0629 \u0635\u0648\u062A\u064A\u0627\u064B \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0628\u0644\u0647\u062C\u0627\u062A \u0645\u062E\u062A\u0644\u0641\u0629 \u062A\u0635\u0641 \u062D\u0631\u0643\u0627\u062A \u0645\u0627\u0644\u064A\u0629 \u0648\u062A\u062D\u0648\u064A\u0644\u0647\u0627 \u0625\u0644\u0649 \u0628\u064A\u0627\u0646\u0627\u062A \u0647\u064A\u0643\u0644\u064A\u0629 \u0628\u062A\u0646\u0633\u064A\u0642 JSON.
\u0627\u0644\u0639\u0645\u0644\u064A\u0627\u062A \u0627\u0644\u0645\u062F\u0639\u0648\u0645\u0629 \u062B\u0644\u0627\u062B\u0629 \u0623\u0646\u0648\u0627\u0639 \u0631\u0626\u064A\u0633\u064A\u0629:
1. "expense" (\u0645\u0635\u0631\u0648\u0641 \u0634\u062E\u0635\u064A \u0623\u0648 \u062A\u062C\u0627\u0631\u064A \u0639\u0627\u062F\u064A)
2. "debt" (\u062F\u064A\u0646 \u0623\u0648 \u0633\u0644\u0641\u0629 \u0634\u062E\u0635\u064A\u0629\u060C \u0633\u0648\u0627\u0621 \u0643\u0627\u0646 \u0645\u0628\u0644\u063A\u0627 \u0645\u0633\u062A\u062D\u0642\u0627 \u0644\u064A "owed_to_me" \u0623\u0648 \u0645\u0628\u0644\u063A\u0627 \u0645\u0633\u062A\u062D\u0642\u0627 \u0639\u0644\u064A "i_owe")
3. "invoice" (\u0641\u0627\u062A\u0648\u0631\u0629 \u0636\u0631\u064A\u0628\u064A\u0629 \u0644\u0639\u0645\u064A\u0644\u060C \u062A\u0634\u062A\u0645\u0644 \u0639\u0644\u0649 \u0628\u0646\u0648\u062F \u0633\u0644\u0639/\u062E\u062F\u0645\u0627\u062A \u0645\u0628\u064A\u0639\u0629 \u0645\u0639 \u0643\u0645\u064A\u0627\u062A\u0647\u0627 \u0648\u0623\u0633\u0639\u0627\u0631\u0647\u0627 \u0648\u0627\u0644\u0636\u0631\u064A\u0628\u0629)

\u0635\u0646\u0641 \u0627\u0644\u0646\u0635 \u0627\u0644\u0645\u062F\u062E\u0644 \u0628\u0630\u0643\u0627\u0621 \u062F\u0642\u064A\u0642 \u062C\u062F\u0627\u064B:
- \u0625\u0630\u0627 \u0630\u0643\u0631 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0643\u0644\u0645\u0629 \u0645\u062B\u0644 "\u0641\u0627\u062A\u0648\u0631\u0629 \u0644\u0640" \u0623\u0648 "\u0641\u0627\u062A\u0648\u0631\u0629 \u0628\u064A\u0639 \u0644\u0640" \u0623\u0648 "\u0639\u0645\u0644\u062A \u0641\u0627\u062A\u0648\u0631\u0629" \u0623\u0648 \u0630\u0643\u0631 \u0628\u064A\u0639 \u0645\u0646\u062A\u062C\u0627\u062A \u0644\u0639\u0645\u064A\u0644 \u0645\u062D\u062F\u062F (\u0645\u062B\u0644 "\u0641\u0627\u062A\u0648\u0631\u0629 \u0644\u0634\u0631\u0643\u0629 \u0627\u0644\u0623\u0645\u0644 \u0628\u064A\u0639 \u062D\u0628\u062A\u064A\u0646 \u0634\u0627\u062D\u0646 \u0622\u064A\u0641\u0648\u0646 \u0628\u0640 50 \u0631\u064A\u0627\u0644")\u060C \u0635\u0646\u0641\u0647\u0627 \u0643\u0640 "invoice".
- \u0625\u0630\u0627 \u0630\u0643\u0631 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u062F\u064A\u0646\u0627\u064B \u0623\u0648 \u0633\u0644\u0641\u0629 (\u0645\u062B\u0644 "\u0623\u0646\u0627 \u0645\u062A\u0633\u0644\u0641 \u0645\u0646 \u0645\u062D\u0645\u062F 100 \u0631\u064A\u0627\u0644" \u0623\u0648 "\u0633\u0644\u0641\u0629 \u0644\u0623\u062D\u0645\u062F 200 \u0631\u064A\u0627\u0644")\u060C \u0635\u0646\u0641\u0647\u0627 \u0643\u0640 "debt".
- \u0625\u0630\u0627 \u0643\u0627\u0646 \u0645\u062C\u0631\u062F \u062F\u0641\u0639 \u0645\u0628\u0644\u063A \u0623\u0648 \u0645\u0635\u0631\u0648\u0641 \u0639\u0627\u062F\u064A (\u0645\u062B\u0644 "\u0635\u0631\u0641\u062A 50 \u0631\u064A\u0627\u0644 \u0644\u0644\u063A\u062F\u0627\u0621" \u0623\u0648 "\u062F\u0641\u0639\u062A 150 \u0631\u064A\u0627\u0644 \u0644\u0644\u0643\u0647\u0631\u0628\u0627\u0621")\u060C \u0635\u0646\u0641\u0647\u0627 \u0643\u0640 "expense".

\u0635\u064A\u063A\u0629 \u0643\u0627\u0626\u0646 \u0627\u0644\u0640 JSON \u0627\u0644\u0645\u062A\u0648\u0642\u0639\u0629 \u0644\u0644\u0645\u062E\u0631\u062C\u0627\u062A \u0647\u064A:
{
  "entryType": "expense" | "debt" | "invoice",
  "data": {
    // \u0641\u064A \u062D\u0627\u0644 \u0643\u0627\u0646 "expense":
    "title": "\u0639\u0646\u0648\u0627\u0646 \u0648\u0648\u0635\u0641 \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629",
    "amount": 120.0,
    "categoryId": "\u062D\u0627\u0648\u0644 \u062A\u062E\u0645\u064A\u0646 \u0623\u062D\u062F \u0627\u0644\u062A\u0635\u0646\u064A\u0641\u0627\u062A \u0645\u062B\u0644 'cat_hospitality' (\u0645\u0637\u0627\u0639\u0645 \u0648\u0636\u064A\u0627\u0641\u0629)\u060C 'cat_transport' (\u0645\u0648\u0627\u0635\u0644\u0627\u062A)\u060C 'cat_bills' (\u0641\u0648\u0627\u062A\u064A\u0631)\u060C 'cat_personal_other' (\u0623\u062E\u0631\u0649)",
    "date": "YYYY-MM-DD",
    "notes": "\u0623\u064A \u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0625\u0636\u0627\u0641\u064A\u0629"

    // \u0641\u064A \u062D\u0627\u0644 \u0643\u0627\u0646 "debt":
    "personName": "\u0627\u0633\u0645 \u0627\u0644\u0634\u062E\u0635 \u0627\u0644\u0645\u062F\u064A\u0646 \u0623\u0648 \u0627\u0644\u062F\u0627\u0626\u0646 \u0628\u0627\u0644\u0643\u0627\u0645\u0644",
    "amount": 500.0,
    "currency": "\u0631.\u0633" \u0623\u0648 "$"\u060C \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A "\u0631.\u0633"
    "type": "owed_to_me" \u0623\u0648 "i_owe"
    "notes": "\u062A\u0641\u0627\u0635\u064A\u0644 \u0625\u0636\u0627\u0641\u064A\u0629 \u0623\u0648 \u0633\u0628\u0628 \u0627\u0644\u062F\u064A\u0646"

    // \u0641\u064A \u062D\u0627\u0644 \u0643\u0627\u0646 "invoice":
    "customerName": "\u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u064A\u0644 \u0623\u0648 \u0627\u0633\u0645 \u0634\u0631\u0643\u062A\u0647",
    "customerPhone": "\u0631\u0642\u0645 \u0647\u0627\u062A\u0641 \u0627\u0644\u0639\u0645\u064A\u0644 \u0625\u0646 \u0648\u062C\u062F \u0623\u0648 null",
    "customerAddress": "\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0648\u0637\u0646\u064A \u0644\u0644\u0639\u0645\u064A\u0644 \u0625\u0646 \u0630\u0643\u0631 \u0623\u0648 null",
    "customerEmail": "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0644\u0644\u0639\u0645\u064A\u0644 \u0625\u0646 \u0630\u0643\u0631 \u0623\u0648 null",
    "items": [
      {
        "description": "\u0627\u0633\u0645 \u0627\u0644\u0645\u0646\u062A\u062C \u0623\u0648 \u0627\u0644\u062E\u062F\u0645\u0629 \u0627\u0644\u0645\u0628\u064A\u0639\u0629 \u0628\u0627\u0644\u0643\u0627\u0645\u0644",
        "quantity": 2,
        "unitPrice": 50.0,
        "taxRate": 15
      }
    ],
    "notes": "\u0623\u064A \u062A\u0641\u0627\u0635\u064A\u0644 \u0623\u0648 \u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0625\u0636\u0627\u0641\u064A\u0629"
  }
}

\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0647\u0627\u0645\u0629 \u062C\u062F\u0627\u064B:
- \u0642\u0645 \u0628\u0627\u062D\u062A\u0633\u0627\u0628 \u0627\u0644\u0645\u0628\u0627\u0644\u063A \u0648\u0627\u0644\u0623\u0639\u062F\u0627\u062F \u0648\u0627\u0644\u0623\u0633\u0645\u0627\u0621 \u0628\u062F\u0642\u0629 \u0645\u062A\u0646\u0627\u0647\u064A\u0629 \u0645\u0646 \u0643\u0644\u0627\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645.
- \u0625\u0630\u0627 \u0644\u0645 \u064A\u0630\u0643\u0631 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0623\u0633\u0639\u0627\u0631\u0627\u064B \u0645\u062D\u062F\u062F\u0629 \u0644\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0648\u0644\u0643\u0646\u0647 \u0630\u0643\u0631 \u0645\u0628\u0644\u063A\u0627 \u0625\u062C\u0645\u0627\u0644\u064A\u0627 \u0644\u0644\u0641\u0627\u062A\u0648\u0631\u0629\u060C \u0641\u0642\u0645 \u0628\u0625\u0646\u0634\u0627\u0621 \u0628\u0646\u062F \u0648\u0627\u062D\u062F \u0641\u064A \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u064A\u0645\u062B\u0644 \u0627\u0644\u062E\u062F\u0645\u0629 \u0623\u0648 \u0627\u0644\u0633\u0644\u0639\u0629 \u0628\u0642\u064A\u0645\u062A\u0647\u0627 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0629.
- \u0623\u0631\u062C\u0639 \u0641\u0642\u0637 \u0648\u0628\u0634\u0643\u0644 \u0635\u0627\u0631\u0645 \u0627\u0644\u0643\u0627\u0626\u0646 \u0628\u0635\u064A\u063A\u0629 JSON \u0628\u062F\u0648\u0646 \u0623\u064A \u0643\u0644\u0627\u0645 \u0625\u0636\u0627\u0641\u064A \u0623\u0648 \u0639\u0644\u0627\u0645\u0627\u062A markdown (\u0644\u0627 \u062A\u0636\u0639 \`\`\`json \u0648\u0644\u0627 \u062A\u0636\u0639 \u0623\u064A \u0634\u0631\u0648\u062D\u0627\u062A).

\u0627\u0644\u0646\u0635 \u0627\u0644\u0645\u062F\u062E\u0644 \u0647\u0648: "${text}"`;
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: promptText }]
          }
        ]
      });
      const responseText = response.text || "";
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return res.json({ success: true, result: parsed });
      } else {
        return res.status(422).json({ error: "\u062A\u0639\u0630\u0631 \u0641\u0647\u0645 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0645\u0646 \u0627\u0644\u0646\u0635." });
      }
    } catch (err) {
      console.error("Error parsing voice input:", err);
      return res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0646\u0635 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A." });
    }
  });
  let whatsappLogs = [];
  async function processWhatsAppMessage({ text, audioBase64, mimeType, senderName, senderPhone }) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        reply: "\u26A0\uFE0F \u0639\u0630\u0631\u0627\u064B\u060C \u0644\u0645 \u064A\u062A\u0645 \u062A\u0647\u064A\u0626\u0629 \u0645\u0641\u062A\u0627\u062D \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A (GEMINI_API_KEY) \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645 \u062D\u062A\u0649 \u0627\u0644\u0622\u0646. \u0627\u0644\u0631\u062C\u0627\u0621 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0641\u062A\u0627\u062D \u0641\u064A \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0644\u062A\u0641\u0639\u064A\u0644 \u0645\u0639\u0627\u0644\u062C\u0629 \u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u0648\u0627\u062A\u0633\u0627\u0628.",
        parsed: null
      };
    }
    try {
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const promptText = `\u0623\u0646\u062A \u0627\u0644\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u0645\u0627\u0644\u064A \u0648\u0627\u0644\u0645\u062D\u0627\u0633\u0628\u064A \u0627\u0644\u0630\u0643\u064A \u0639\u0628\u0631 \u0627\u0644\u0648\u0627\u062A\u0633\u0627\u0628 \u0644\u0645\u0646\u0635\u0629 "\u0627\u0644\u0646\u0648\u0627\u0629 \u0644\u0644\u062A\u0642\u0646\u064A\u0629 \u0648\u0627\u0644\u0645\u062D\u0627\u0633\u0628\u0629 \u0627\u0644\u0636\u0631\u064A\u0628\u064A\u0629".
\u0645\u0647\u0645\u062A\u0643 \u0647\u064A \u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u0646\u0635\u064A\u0629 \u0623\u0648 \u0627\u0644\u0627\u0633\u062A\u0645\u0627\u0639 \u0644\u0644\u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u0635\u0648\u062A\u064A\u0629 \u0627\u0644\u0645\u0631\u0641\u0642\u0629 \u0648\u062A\u062D\u062F\u064A\u062F \u0646\u0648\u0639 \u0627\u0644\u062D\u0631\u0643\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u0628\u062F\u0642\u0629 \u0648\u062A\u0646\u0633\u064A\u0642\u0647\u0627 \u0641\u064A \u0643\u0627\u0626\u0646 JSON\u060C \u0648\u0635\u064A\u0627\u063A\u0629 \u0631\u062F \u0645\u0627\u0644\u064A \u0648\u0645\u062D\u0627\u0633\u0628\u064A \u0648\u062F\u0648\u062F \u0648\u0645\u0646\u0638\u0645 \u062C\u062F\u0627\u064B \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0645\u0639 \u0625\u064A\u0645\u0648\u062C\u064A \u0644\u0637\u064A\u0641\u0629 \u064A\u0648\u0636\u062D \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0646\u062C\u0627\u062D \u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629.

\u0627\u0644\u062D\u0631\u0643\u0627\u062A \u0627\u0644\u0645\u062F\u0639\u0648\u0645\u0629:
1. "expense" (\u0645\u0635\u0631\u0648\u0641): \u0639\u0646\u062F \u0648\u0635\u0641 \u0634\u0631\u0627\u0621 \u0623\u0648 \u0635\u0631\u0641 \u0623\u0648 \u062F\u0641\u0639 \u0645\u0628\u0627\u0644\u063A (\u0645\u062B\u0644: \u062F\u0641\u0639\u062A 45 \u0631\u064A\u0627\u0644 \u0628\u0646\u0632\u064A\u0646\u060C \u0633\u062C\u0644 \u0645\u0635\u0631\u0648\u0641 \u0643\u0647\u0631\u0628\u0627\u0621 200 \u0631\u064A\u0627\u0644).
2. "debt" (\u062F\u064A\u0646 \u0623\u0648 \u0633\u0644\u0641\u0629): \u0639\u0646\u062F \u0648\u0635\u0641 \u062F\u064A\u0646 \u0645\u0633\u062A\u062D\u0642 \u0644\u0643 \u0623\u0648 \u0639\u0644\u064A\u0643 (\u0645\u062B\u0644: \u062A\u0633\u0644\u0641\u062A \u0645\u0646 \u0623\u0628\u0648 \u0645\u062D\u0645\u062F 1500 \u0631\u064A\u0627\u0644\u060C \u0623\u0639\u0637\u064A\u062A \u0623\u062D\u0645\u062F \u0633\u0644\u0641\u0629 300 \u0631\u064A\u0627\u0644).
3. "invoice" (\u0641\u0627\u062A\u0648\u0631\u0629 \u0628\u064A\u0639): \u0639\u0646\u062F \u0648\u0635\u0641 \u0628\u064A\u0639 \u0633\u0644\u0639 \u0623\u0648 \u062E\u062F\u0645\u0627\u062A \u0644\u0639\u0645\u064A\u0644\u060C \u062A\u0634\u062A\u0645\u0644 \u0639\u0644\u0649 \u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u064A\u0644\u060C \u0648\u0627\u0644\u0645\u0646\u062A\u062C\u060C \u0627\u0644\u0643\u0645\u064A\u0629\u060C \u0648\u0627\u0644\u0633\u0639\u0631\u060C \u0648\u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629 (\u0645\u062B\u0644: \u0641\u0627\u062A\u0648\u0631\u0629 \u0644\u0634\u0631\u0643\u0629 \u0627\u0644\u0623\u0645\u0644 \u0628\u064A\u0639 2 \u0634\u0627\u062D\u0646 \u0622\u064A\u0641\u0648\u0646 \u0633\u0639\u0631 \u0627\u0644\u062D\u0628\u0629 50 \u0631\u064A\u0627\u0644 \u0648\u0636\u0631\u064A\u0628\u0629 15%).
4. "query" (\u0627\u0633\u062A\u0639\u0644\u0627\u0645 \u0645\u0627\u0644\u064A): \u0639\u0646\u062F \u0627\u0644\u0633\u0624\u0627\u0644 \u0639\u0646 \u0627\u0644\u0631\u0635\u064A\u062F\u060C \u0627\u0644\u062F\u064A\u0648\u0646\u060C \u0623\u0648 \u062A\u0642\u0631\u064A\u0631 \u0645\u0627\u0644\u064A (\u0645\u062B\u0644: \u0643\u0645 \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0631\u061F \u0643\u0645 \u062F\u064A\u0648\u0646\u064A \u0644\u0623\u062D\u0645\u062F\u061F).
5. "greeting" (\u062A\u0631\u062D\u064A\u0628): \u062A\u0631\u062D\u064A\u0628 \u0639\u0627\u0645 \u0623\u0648 \u0634\u0643\u0631 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645.

\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0635\u064A\u0627\u063A\u0629 \u0644\u0643\u0627\u0626\u0646 JSON \u0627\u0644\u0645\u0631\u062A\u062C\u0639:
\u064A\u062C\u0628 \u0623\u0646 \u062A\u0631\u062C\u0639 JSON \u0628\u0627\u0644\u0634\u0643\u0644 \u0627\u0644\u062A\u0627\u0644\u064A \u0628\u062F\u0642\u0629 \u0645\u062A\u0646\u0627\u0647\u064A\u0629:
{
  "entryType": "expense" | "debt" | "invoice" | "query" | "greeting" | "unknown",
  "data": {
    // \u0641\u064A \u062D\u0627\u0644 \u0643\u0627\u0646 expense:
    "title": "\u0639\u0646\u0648\u0627\u0646 \u0648\u0648\u0635\u0641 \u0627\u0644\u0645\u0635\u0631\u0648\u0641 (\u0645\u062B\u0627\u0644: \u0628\u0646\u0632\u064A\u0646 \u0633\u064A\u0627\u0631\u0629)",
    "amount": 45.0,
    "categoryId": "\u062A\u062E\u0645\u064A\u0646 \u0627\u0644\u062A\u0635\u0646\u064A\u0641: 'cat_hospitality' (\u0645\u0637\u0627\u0639\u0645)\u060C 'cat_transport' (\u0645\u0648\u0627\u0635\u0644\u0627\u062A)\u060C 'cat_bills' (\u0641\u0648\u0627\u062A\u064A\u0631 \u0648\u062D\u0643\u0648\u0645\u064A)\u060C 'cat_personal_other' (\u0623\u062E\u0631\u0649)",
    "notes": "\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0625\u0636\u0627\u0641\u064A\u0629"

    // \u0641\u064A \u062D\u0627\u0644 \u0643\u0627\u0646 debt:
    "personName": "\u0627\u0633\u0645 \u0627\u0644\u0634\u062E\u0635",
    "amount": 1500.0,
    "currency": "\u0631.\u0633",
    "type": "owed_to_me" (\u0633\u0644\u0641\u0629 \u0645\u0646\u0651\u064A \u0644\u0623\u062D\u062F\u0647\u0645) \u0623\u0648 "i_owe" (\u062F\u064A\u0646 \u0639\u0644\u064A\u0651 \u0644\u0623\u062D\u062F\u0647\u0645),
    "notes": "\u0633\u0628\u0628 \u0627\u0644\u0633\u0644\u0641\u0629 \u0623\u0648 \u0627\u0644\u062F\u064A\u0646"

    // \u0641\u064A \u062D\u0627\u0644 \u0643\u0627\u0646 invoice:
    "customerName": "\u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u064A\u0644",
    "customerPhone": "\u0631\u0642\u0645 \u0647\u0627\u062A\u0641 \u0627\u0644\u0639\u0645\u064A\u0644 \u0625\u0646 \u0648\u062C\u062F \u0623\u0648 null",
    "items": [
      {
        "description": "\u0627\u0633\u0645 \u0627\u0644\u0645\u0646\u062A\u062C \u0623\u0648 \u0627\u0644\u062E\u062F\u0645\u0629",
        "quantity": 2,
        "unitPrice": 50.0,
        "taxRate": 15
      }
    ],
    "notes": "\u062A\u0641\u0627\u0635\u064A\u0644 \u0625\u0636\u0627\u0641\u064A\u0629 \u0644\u0644\u0641\u0627\u062A\u0648\u0631\u0629"
  },
  "reply": "\u0635\u064A\u063A\u0629 \u0627\u0644\u0631\u062F \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u0645\u062D\u0628\u0628\u0629 \u0645\u0639 \u0625\u064A\u0645\u0648\u062C\u064A (\u0645\u062B\u0627\u0644: \u0623\u0628\u0634\u0631 \u064A\u0627 \u0623\u062D\u0645\u062F! \u{1F37D}\uFE0F \u0644\u0642\u062F \u0642\u0645\u062A \u0628\u0641\u0647\u0645 \u0643\u0644\u0627\u0645\u0643 \u0648\u062A\u0633\u062C\u064A\u0644 \u0645\u0635\u0631\u0648\u0641 \u062C\u062F\u064A\u062F: \u0645\u0635\u0631\u0648\u0641 \u063A\u062F\u0627\u0621 \u0628\u0642\u064A\u0645\u0629 50 \u0631\u064A\u0627\u0644.)"
}

\u0627\u0644\u0631\u062F \u0627\u0644\u0645\u0643\u062A\u0648\u0628 \u0641\u064A \u062D\u0642\u0644 "reply":
- \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0645\u0648\u062C\u0647\u0627\u064B \u0628\u0627\u0633\u0645 \u0627\u0644\u0645\u0631\u0633\u0644 \u0625\u0630\u0627 \u0639\u0631\u0641\u062A\u0647 (\u0627\u0644\u0645\u0631\u0633\u0644 \u0627\u0633\u0645\u0647: \${senderName}\u060C \u0648\u0631\u0642\u0645\u0647: \${senderPhone}).
- \u0641\u064A \u062D\u0627\u0644 \u0627\u0644\u0645\u0635\u0631\u0648\u0641: \u0648\u0636\u062D \u0623\u0646 \u0627\u0644\u062D\u0631\u0643\u0629 \u062C\u0627\u0647\u0632\u0629 \u0644\u0644\u0645\u0632\u0627\u0645\u0646\u0629 \u0628\u0636\u063A\u0637\u0629 \u0632\u0631 \u0623\u0648 \u062A\u0645\u062A \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B.
- \u0641\u064A \u062D\u0627\u0644 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629: \u0627\u0643\u062A\u0628 \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0628\u0646\u0648\u062F \u0648\u0627\u0644\u0636\u0631\u064A\u0628\u0629 \u0648\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A \u0628\u0648\u0636\u0648\u062D \u0641\u064A \u0631\u062F\u0643 \u0644\u062A\u0623\u0643\u064A\u062F \u0627\u0644\u0641\u0647\u0645.
- \u0641\u064A \u062D\u0627\u0644 \u0627\u0644\u062F\u064A\u0646: \u062D\u062F\u062F \u0645\u0627 \u0625\u0630\u0627 \u0643\u0627\u0646 \u0627\u0644\u062F\u064A\u0646 \u0645\u0633\u062A\u062D\u0642 \u0644\u0647 \u0623\u0648 \u0639\u0644\u064A\u0647 \u0648\u0628\u062F\u0642\u0629.

\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0647\u0627\u0645\u0629:
- \u0623\u0631\u062C\u0639 \u0643\u0627\u0626\u0646 JSON \u0641\u0642\u0637 \u0648\u0628\u0634\u0643\u0644 \u0635\u0627\u0631\u0645. \u0644\u0627 \u062A\u0636\u0639 \u0639\u0644\u0627\u0645\u0627\u062A markdown \`\`\`json \u0623\u0648 \u0623\u064A \u0646\u0635\u0648\u0635 \u0642\u0628\u0644\u0647\u0627 \u0623\u0648 \u0628\u0639\u062F\u0647\u0627. \u064A\u062C\u0628 \u0623\u0646 \u062A\u0628\u062F\u0623 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0628\u0640 { \u0648\u062A\u0646\u062A\u0647\u064A \u0628\u0640 } \u0644\u062A\u0633\u0647\u064A\u0644 \u062A\u062D\u0644\u064A\u0644\u0647\u0627.`;
      const contents = [];
      if (audioBase64) {
        contents.push({
          inlineData: {
            mimeType: mimeType || "audio/ogg",
            data: audioBase64.replace(/^data:[^;]+;base64,/, "")
          }
        });
      }
      let userText = `\u0627\u0633\u0645 \u0627\u0644\u0645\u0631\u0633\u0644: ${senderName}
\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641: ${senderPhone}`;
      if (text) {
        userText += `
\u0646\u0635 \u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u0645\u0631\u0633\u0644\u0629: "${text}"`;
      } else {
        userText += `
\u0627\u0644\u0631\u062C\u0627\u0621 \u0627\u0644\u0627\u0633\u062A\u0645\u0627\u0639 \u0644\u0644\u0645\u0644\u0641 \u0627\u0644\u0635\u0648\u062A\u064A \u0627\u0644\u0645\u0631\u0641\u0642\u060C \u0648\u062A\u0641\u0631\u064A\u063A \u0627\u0644\u0646\u0635 \u0645\u0646\u0647 \u0643\u0631\u0633\u0627\u0644\u0629 \u0645\u0633\u062A\u0644\u0645\u0629\u060C \u062B\u0645 \u062A\u062D\u0644\u064A\u0644\u0647\u0627 \u0645\u0627\u0644\u064A\u064B\u0627 \u0648\u0645\u062D\u0627\u0633\u0628\u064A\u064B\u0627 \u0637\u0628\u0642\u064B\u0627 \u0644\u0644\u062A\u0639\u0644\u064A\u0645\u0627\u062A.`;
      }
      contents.push({ text: promptText + `

\u0627\u0644\u0645\u062F\u062E\u0644\u0627\u062A \u0627\u0644\u062D\u0627\u0644\u064A\u0629:
${userText}` });
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents
      });
      const responseText = response.text || "";
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          reply: parsed.reply || "\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0627\u0644\u062D\u0631\u0643\u0629 \u0628\u0646\u062C\u0627\u062D \u0648\u0641\u0647\u0645\u0647\u0627!",
          parsed
        };
      } else {
        console.warn("Could not parse JSON from Gemini response:", responseText);
        return {
          success: false,
          reply: `\u{1F4DD} \u0627\u0633\u062A\u0644\u0645\u062A \u0631\u0633\u0627\u0644\u062A\u0643: "${responseText.slice(0, 100)}"\u060C \u0644\u0643\u0646 \u062A\u0639\u0630\u0631 \u0639\u0644\u064A\u0651 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u062D\u0631\u0643\u0629 \u0645\u0627\u0644\u064A\u0629 \u0647\u064A\u0643\u0644\u064A\u0629 \u0645\u0646\u0647\u0627. \u0647\u0644 \u064A\u0645\u0643\u0646\u0643 \u0635\u064A\u0627\u063A\u062A\u0647\u0627 \u0628\u0634\u0643\u0644 \u0623\u0648\u0636\u062D\u061F (\u0645\u062B\u0627\u0644: "\u0633\u062C\u0644 \u0645\u0635\u0631\u0648\u0641 \u0628\u0646\u0632\u064A\u0646 50 \u0631\u064A\u0627\u0644")`,
          parsed: {
            entryType: "unknown",
            transcribedText: responseText
          }
        };
      }
    } catch (err) {
      console.error("Error in processWhatsAppMessage:", err);
      return {
        success: false,
        reply: "\u274C \u0639\u0630\u0631\u0627\u064B\u060C \u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A. \u0627\u0644\u0631\u062C\u0627\u0621 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.",
        parsed: null
      };
    }
  }
  app.get("/api/whatsapp/webhook", (req, res) => {
    const verifyToken = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    const mode = req.query["hub.mode"];
    if (mode === "subscribe" && verifyToken) {
      console.log("WhatsApp webhook verified successfully!");
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Forbidden");
  });
  function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case "&":
          return "&amp;";
        case "'":
          return "&apos;";
        case '"':
          return "&quot;";
        default:
          return c;
      }
    });
  }
  app.post("/api/whatsapp/webhook", async (req, res) => {
    try {
      const body = req.body;
      console.log("Received WhatsApp Webhook payload:", JSON.stringify(body, null, 2));
      const isTwilio = body.AccountSid || body.From && body.From.startsWith("whatsapp:");
      if (isTwilio) {
        const rawFrom = body.From || "";
        const from = rawFrom.replace("whatsapp:", "").trim();
        const msgId = body.MessageSid || "tw_" + Date.now();
        const timestamp = (/* @__PURE__ */ new Date()).toISOString();
        let messageText = body.Body || "";
        let type = "text";
        let audioBase64 = "";
        let audioMimeType = "";
        const numMedia = parseInt(body.NumMedia || "0");
        if (numMedia > 0 && body.MediaContentType0?.startsWith("audio/")) {
          type = "audio";
          audioMimeType = body.MediaContentType0;
          messageText = "\u{1F3A4} [\u0631\u0633\u0627\u0644\u0629 \u0635\u0648\u062A\u064A\u0629 \u0645\u0633\u062A\u0644\u0645\u0629 \u0639\u0628\u0631 Twilio]";
          const mediaUrl = body.MediaUrl0;
          if (mediaUrl) {
            try {
              const downloadRes = await fetch(mediaUrl);
              const audioBuffer = await downloadRes.arrayBuffer();
              audioBase64 = Buffer.from(audioBuffer).toString("base64");
            } catch (mediaErr) {
              console.error("Error downloading Twilio audio:", mediaErr);
            }
          }
        }
        const aiResult = await processWhatsAppMessage({
          text: type === "text" ? messageText : "",
          audioBase64,
          mimeType: audioMimeType,
          senderName: from,
          senderPhone: from
        });
        const newLog = {
          id: msgId,
          timestamp,
          sender: from,
          senderName: `\u0639\u0645\u064A\u0644 \u0648\u0627\u062A\u0633\u0627\u0628 (\u062A\u0648\u064A\u0644\u064A\u0648: ${from})`,
          type,
          content: messageText,
          status: aiResult.success ? "processed" : "failed",
          parsedAction: aiResult.parsed,
          reply: aiResult.reply,
          synced: false,
          provider: "twilio"
        };
        whatsappLogs.unshift(newLog);
        if (whatsappLogs.length > 100) {
          whatsappLogs = whatsappLogs.slice(0, 100);
        }
        res.header("Content-Type", "text/xml");
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>
        <Body>${escapeXml(aiResult.reply || "\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0648\u062A\u0648\u062B\u064A\u0642 \u0631\u0633\u0627\u0644\u062A\u0643 \u0628\u0646\u062C\u0627\u062D.")}</Body>
    </Message>
</Response>`;
        return res.status(200).send(twiml);
      }
      if (body.object === "whatsapp_business_account") {
        const entry = body.entry?.[0];
        const change = entry?.changes?.[0];
        const value = change?.value;
        const message = value?.messages?.[0];
        if (message) {
          const from = message.from;
          const msgId = message.id;
          const timestamp = new Date(parseInt(message.timestamp) * 1e3).toISOString();
          let messageText = "";
          let type = "text";
          let audioBase64 = "";
          let audioMimeType = "";
          if (message.type === "text") {
            messageText = message.text?.body || "";
            type = "text";
          } else if (message.type === "audio") {
            type = "audio";
            const audioId = message.audio?.id;
            audioMimeType = message.audio?.mime_type || "audio/ogg";
            messageText = "\u{1F3A4} [\u0631\u0633\u0627\u0644\u0629 \u0635\u0648\u062A\u064A\u0629 \u0645\u0633\u062A\u0644\u0645\u0629 \u0639\u0628\u0631 Meta]";
            const accessToken2 = process.env.WHATSAPP_ACCESS_TOKEN;
            if (accessToken2 && audioId) {
              try {
                const mediaRes = await fetch(`https://graph.facebook.com/v18.0/${audioId}`, {
                  headers: { "Authorization": `Bearer ${accessToken2}` }
                });
                const mediaData = await mediaRes.json();
                const downloadUrl = mediaData.url;
                if (downloadUrl) {
                  const downloadRes = await fetch(downloadUrl, {
                    headers: { "Authorization": `Bearer ${accessToken2}` }
                  });
                  const audioBuffer = await downloadRes.arrayBuffer();
                  audioBase64 = Buffer.from(audioBuffer).toString("base64");
                }
              } catch (mediaErr) {
                console.error("Error downloading Meta WhatsApp audio:", mediaErr);
              }
            }
          }
          const aiResult = await processWhatsAppMessage({
            text: type === "text" ? messageText : "",
            audioBase64,
            mimeType: audioMimeType,
            senderName: value?.contacts?.[0]?.profile?.name || from,
            senderPhone: from
          });
          const newLog = {
            id: msgId || "wa_" + Date.now(),
            timestamp,
            sender: from,
            senderName: value?.contacts?.[0]?.profile?.name || "\u0645\u0633\u062A\u062E\u062F\u0645 \u0648\u0627\u062A\u0633\u0627\u0628",
            type,
            content: messageText,
            status: aiResult.success ? "processed" : "failed",
            parsedAction: aiResult.parsed,
            reply: aiResult.reply,
            synced: false,
            provider: "meta"
          };
          whatsappLogs.unshift(newLog);
          if (whatsappLogs.length > 100) {
            whatsappLogs = whatsappLogs.slice(0, 100);
          }
          const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
          const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
          if (phoneNumberId && accessToken && aiResult.reply) {
            try {
              await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${accessToken}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  messaging_product: "whatsapp",
                  to: from,
                  type: "text",
                  text: { body: aiResult.reply }
                })
              });
              console.log(`Sent Meta WhatsApp response to ${from}`);
            } catch (replyErr) {
              console.error("Error sending Meta WhatsApp message response:", replyErr);
            }
          }
        }
      }
      return res.status(200).send("EVENT_RECEIVED");
    } catch (err) {
      console.error("Error in WhatsApp webhook endpoint:", err);
      return res.status(500).send("INTERNAL_ERROR");
    }
  });
  app.post("/api/whatsapp/simulate", async (req, res) => {
    try {
      const { text, audioBase64, mimeType, senderName, senderPhone } = req.body;
      const phone = senderPhone || "+966501234567";
      const name = senderName || "\u0623\u062D\u0645\u062F \u0627\u0644\u062D\u0631\u0628\u064A";
      const type = audioBase64 ? "audio" : "text";
      const content = text || "\u{1F3A4} \u0631\u0633\u0627\u0644\u0629 \u0635\u0648\u062A\u064A\u0629 \u0645\u062D\u0627\u0643\u0627\u0629";
      const aiResult = await processWhatsAppMessage({
        text: type === "text" ? text : "",
        audioBase64,
        mimeType,
        senderName: name,
        senderPhone: phone
      });
      const newLog = {
        id: "sim_" + Date.now(),
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        sender: phone,
        senderName: name,
        type,
        content,
        status: aiResult.success ? "processed" : "failed",
        parsedAction: aiResult.parsed,
        reply: aiResult.reply,
        synced: false
      };
      whatsappLogs.unshift(newLog);
      if (whatsappLogs.length > 100) {
        whatsappLogs = whatsappLogs.slice(0, 100);
      }
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
      if (phoneNumberId && accessToken && aiResult.reply && phone && !phone.startsWith("+966500000")) {
        try {
          await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: phone,
              type: "text",
              text: { body: aiResult.reply }
            })
          });
          console.log(`Sent real WhatsApp reply for simulated event to ${phone}`);
        } catch (replyErr) {
          console.error("Failed to dispatch real WhatsApp reply during simulation:", replyErr);
        }
      }
      return res.json({ success: true, log: newLog });
    } catch (err) {
      console.error("Error in simulation endpoint:", err);
      return res.status(500).json({ success: false, error: err.message || "Error processing simulated message" });
    }
  });
  app.get("/api/whatsapp/logs", (req, res) => {
    res.json({ success: true, logs: whatsappLogs });
  });
  app.post("/api/whatsapp/clear-logs", (req, res) => {
    whatsappLogs = [];
    res.json({ success: true });
  });
  app.post("/api/whatsapp/mark-synced", (req, res) => {
    const { id } = req.body;
    const log = whatsappLogs.find((l) => l.id === id);
    if (log) {
      log.synced = true;
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Log not found" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
