import pg from "pg";
const { Client } = pg;

const client = new Client();
await client.connect();

const query = "SELECT * FROM ticket WHERE id = $1";
const params = ["999"];

try {
  const res = await client.query(query, params);
  console.log(res.rows);
} catch (error) {
  console.error(error);
} finally {
  await client.end();
  console.info("Connection Closed!");
}
