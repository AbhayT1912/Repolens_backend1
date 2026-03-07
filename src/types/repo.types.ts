export type RepoStatus =
  | "RECEIVED"
  | "CLONING"
  | "SCANNING"
  | "PARSING"
  | "GRAPHING"
  | "READY"
  | "FAILED";

export interface RepoLifecycle {
  id: string;
  repo_url: string;
  status: RepoStatus;
  error_message?: string;
}
