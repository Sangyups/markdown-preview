import { contextBridge, ipcRenderer } from "electron";

import { createPreviewApi } from "./preview-api";

contextBridge.exposeInMainWorld("previewBridge", createPreviewApi(ipcRenderer));
