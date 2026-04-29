export interface Champion {
  apiName: string;
  name: string;
  cost: number;
  traits: string[];
  icon: string;
}

export interface Trait {
  apiName: string;
  name: string;
  icon: string;
  hasEmblem: boolean;
}

export interface SetData {
  setNumber: number;
  champions: Champion[];
  traits: Trait[];
  plannerMap: Record<string, string>;
}

export interface UnitState {
  apiName: string;
  emblems: string[];
}
