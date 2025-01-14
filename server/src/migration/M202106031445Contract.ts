import { SchemaBuilder } from "knex";
import { contractTableName } from "@models/Contract/Entity";

export default (schema: SchemaBuilder) => {
  return schema.createTable(contractTableName, (table) => {
    table.string("id", 36).notNullable();
    table.string("address", 42).notNullable();
    table.integer("network").notNullable();
    table.string("name", 512).notNullable();
    table.jsonb("abi").nullable();
    table.integer("startHeight").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.dateTime("createdAt").notNullable();
    table.unique(["address", "network"]);
    table.primary(["id"], `${contractTableName}_pkey`);
  });
};
