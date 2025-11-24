export type Pokemon = {
  name: string;
  url: string;
  id: number;
  sprites?: {
    front_default: string;
    front_shiny: string;
    other: {
      "official-artwork": {
        front_default: string;
      };
    };
  };
  types?: Array<{
    type: {
      name: string;
    };
  }>;
}