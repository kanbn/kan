export interface TrelloBoard {
  id: string;
  name: string;
  labels: TrelloLabel[];
  lists: TrelloList[];
  cards: TrelloCard[];
  checklists: TrelloChecklist[];
}

export interface TrelloLabel {
  id: string;
  name: string;
  color?: string | null;
}

export interface TrelloList {
  id: string;
  name: string;
}

export interface TrelloChecklist {
  id: string;
  idCard: string;
  name: string;
  checkItems: TrelloCheckItem[];
}

export interface TrelloCheckItem {
  id: string;
  name: string;
  state: "complete" | "incomplete";
  pos: number;
}

export interface GitHubProjectsResponse {
  data: {
    viewer: {
      projectsV2: {
        nodes?: { id: string; title: string }[];
      };
      organizations: {
        nodes: {
          projectsV2: {
            nodes?: { id: string; title: string }[];
          };
        }[];
      };
    };
  };
  errors?: unknown[];
}

export interface GitHubGraphQLResponse {
  data?: {
    node?: GitHubProjectV2Node;
  };
  errors?: unknown[];
}

export interface GitHubProjectV2Node {
  title: string;
  field?: {
    options?: { id: string; name: string }[];
  };
  areaField?: {
    options?: { id: string; name: string; color: string }[];
  };
  items?: {
    nodes: {
      fieldValueByName?: { name: string };
      areaValue?: { name: string };
      content?: {
        title?: string;
        body?: string;
      };
    }[];
  };
}

export interface TrelloCard {
  id: string;
  name: string | null;
  desc: string;
  idList: string;
  labels: TrelloLabel[];
  idChecklists: string[];
  checkItemStates: TrelloCheckItemState[];
}

export interface TrelloCheckItemState {
  idChecklist: string;
  idCheckItem: string;
  state: "complete" | "incomplete";
}
