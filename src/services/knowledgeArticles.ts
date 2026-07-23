import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import type { KnowledgeArticle } from "../types";

/**
 * One-time fetch, not a live `onSnapshot` subscription — this content is
 * seeded/managed out-of-band (see `scripts/seed-articles.ts`), not written
 * to from within the running app, so there's nothing that would change
 * while a user has the Alerts page open.
 */
export async function getKnowledgeArticles(): Promise<KnowledgeArticle[]> {
  const snapshot = await getDocs(collection(db, "knowledgeArticles"));
  const articles = snapshot.docs.map(
    (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as KnowledgeArticle,
  );
  articles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return articles;
}
