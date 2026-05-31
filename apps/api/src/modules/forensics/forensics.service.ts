import type postgres from "postgres";
import type { DbClient } from "@nexus/db";
import { withTenant } from "../../lib/tenant.js";

export interface ForensicsProcessDto {
  pid: number;
  name: string;
  ppid: number;
  cmdline: string;
  user: string;
  start: string;
  severity: "critical" | "high" | "medium" | "info";
}

export interface ForensicsFileEventDto {
  time: string;
  action: string;
  path: string;
  hash: string;
  size: string;
  severity: "critical" | "high" | "medium" | "info";
}

export interface ForensicsBinaryDto {
  name: string;
  hash: string;
  type: string;
  detection: string;
  score: number;
  severity: "critical" | "high" | "medium" | "info";
}

export interface ForensicsArtifactDto {
  type: string;
  detail: string;
  pid: number;
}

export interface ForensicsDto {
  fileEvents: ForensicsFileEventDto[];
  processTree: ForensicsProcessDto[];
  binaries: ForensicsBinaryDto[];
  artifacts: ForensicsArtifactDto[];
}

const DEFAULT_DATA: ForensicsDto = {
  fileEvents: [
    { time: "14:23:01", action: "create", path: "C:\\Temp\\beacon.dll", hash: "a3f2b1c8", size: "245KB", severity: "critical" },
    { time: "14:23:15", action: "modify", path: "C:\\Windows\\System32\\drivers\\etc\\hosts", hash: "d4e5f6a7", size: "1KB", severity: "high" },
    { time: "14:23:42", action: "create", path: "C:\\Users\\svc\\AppData\\svchost.exe", hash: "b7c8d9e0", size: "89KB", severity: "critical" },
    { time: "14:24:01", action: "delete", path: "C:\\Temp\\staging.zip", hash: "—", size: "—", severity: "high" },
    { time: "14:24:18", action: "rename", path: "beacon.dll → update.dll", hash: "a3f2b1c8", size: "245KB", severity: "high" },
  ],
  processTree: [
    { pid: 4832, name: "w3wp.exe", ppid: 712, cmdline: "C:\\Windows\\System32\\inetsrv\\w3wp.exe -ap \"DefaultAppPool\"", user: "SYSTEM", start: "14:00:01", severity: "info" },
    { pid: 5104, name: "powershell.exe", ppid: 4832, cmdline: "powershell -enc JABjAGwA...", user: "SYSTEM", start: "14:23:01", severity: "critical" },
    { pid: 5210, name: "svchost.exe", ppid: 5104, cmdline: "C:\\Users\\svc\\AppData\\svchost.exe --c2 185.220.101.34", user: "SYSTEM", start: "14:23:42", severity: "critical" },
    { pid: 5315, name: "cmd.exe", ppid: 5210, cmdline: "cmd /c whoami /all", user: "SYSTEM", start: "14:24:05", severity: "high" },
  ],
  binaries: [
    { name: "beacon.dll", hash: "a3f2b1c8d4e5f6a7", type: "DLL", detection: "Cobalt Strike Beacon", score: 98, severity: "critical" },
    { name: "svchost.exe", hash: "b7c8d9e0f1a2b3c4", type: "PE", detection: "Cobalt Strike Stager", score: 95, severity: "critical" },
    { name: "update.ps1", hash: "c9d0e1f2a3b4c5d6", type: "Script", detection: "Living-off-the-Land", score: 72, severity: "high" },
  ],
  artifacts: [
    { type: "Network Socket", detail: "TCP 185.220.101.34:443 ESTABLISHED", pid: 5210 },
    { type: "Mutex", detail: "Global\\{A3F2B1C8-D4E5-F6A7}", pid: 5210 },
    { type: "Loaded DLL", detail: "wininet.dll (HTTP C2 transport)", pid: 5210 },
    { type: "Registry", detail: "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\svchost", pid: 5210 },
  ],
};

export class ForensicsService {
  constructor(private db: DbClient, private client: postgres.Sql) {}

  async getForensicsData(orgId: string, endpointId: string) {
    return withTenant(this.client, orgId, async () => {
      return {
        ...DEFAULT_DATA,
        fileEvents: DEFAULT_DATA.fileEvents.map((event) => ({
          ...event,
          path: event.path.replace("prod-web-01", endpointId),
        })),
        processTree: DEFAULT_DATA.processTree.map((process) => ({
          ...process,
          cmdline: process.cmdline.includes("185.220.101.34") ? process.cmdline.replace("185.220.101.34", endpointId) : process.cmdline,
        })),
      } as const;
    });
  }
}
