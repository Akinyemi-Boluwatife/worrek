import { defineRelations } from "drizzle-orm";

import { authRelations } from "./auth-schema";
import * as schema from "./schema";

const appRelations = defineRelations(schema, () => ({}));

export const relations = {
  ...appRelations,
  ...authRelations,
};
