/* Clean up browser-test artifacts so the demo data stays pristine. */
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const TEST_POST_SNIPPETS = [
  "Browser test:",
  "Photo upload test via API",
  "Testing the Harax composer from the terminal",
];
const TEST_COMMENT_SNIPPETS = ["First comment from the browser test"];
const TEST_MSG_SNIPPETS = [
  "Real-time chat verified",
  "Round-trip verified",
  "Hello from the browser test",
  "Sending from browser via gateway",
];

async function main() {
  for (const s of TEST_POST_SNIPPETS) {
    const posts = await db.post.findMany({ where: { content: { contains: s } } });
    for (const p of posts) {
      await db.comment.deleteMany({ where: { postId: p.id } });
      await db.like.deleteMany({ where: { postId: p.id } });
      await db.post.delete({ where: { id: p.id } });
    }
  }
  for (const s of TEST_COMMENT_SNIPPETS) {
    await db.comment.deleteMany({ where: { content: { contains: s } } });
  }
  for (const s of TEST_MSG_SNIPPETS) {
    await db.message.deleteMany({ where: { content: { contains: s } } });
  }
  // remove stale test notifications created by the test interactions
  await db.notification.deleteMany({
    where: { title: { contains: "reacted to your post" } },
  });
  console.log("✅ test artifacts cleaned");
  console.log("posts:", await db.post.count(), "| messages:", await db.message.count());
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
