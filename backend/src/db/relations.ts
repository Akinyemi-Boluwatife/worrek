import { defineRelations } from "drizzle-orm";

import { authRelations, user } from "./auth-schema";
import * as schema from "./schema";

const appRelations = defineRelations({ ...schema, user }, (r) => ({
  document: {
    owner: r.one.user({
      from: r.document.userId,
      to: r.user.id,
    }),
  },
  user: {
    documents: r.many.document({
      from: r.user.id,
      to: r.document.userId,
    }),
  },
}));

export const relations = {
  ...appRelations,
  ...authRelations,
  user: {
    table: user,
    name: "user",
    relations: {
      ...appRelations.user.relations,
      ...authRelations.user.relations,
    },
  },
};
