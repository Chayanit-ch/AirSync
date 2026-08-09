import { useEffect, useMemo, useState } from "react";
import { NewsSearchBar } from "../components/alerts/NewsSearchBar";
import { CategoryFilter, type ArticleFilter } from "../components/alerts/CategoryFilter";
import { FeaturedArticleCard } from "../components/alerts/FeaturedArticleCard";
import { KnowledgeArticlesSection } from "../components/alerts/KnowledgeArticlesSection";
import { LegalWarningCard } from "../components/alerts/LegalWarningCard";
import { NewsFeedSection } from "../components/alerts/NewsFeedSection";
import { ProvincialRegulationCard } from "../components/alerts/ProvincialRegulationCard";
import { getKnowledgeArticles } from "../services/knowledgeArticles";
import { useCurrentProvince } from "../hooks/useCurrentProvince";
import { useProvincialRegulation } from "../hooks/useProvincialRegulation";
import { useTranslation } from "../hooks/useTranslation";
import type { KnowledgeArticle } from "../types";

export function AlertsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<ArticleFilter>("all");
  const { t } = useTranslation();

  const currentProvince = useCurrentProvince();
  const provincialRegulation = useProvincialRegulation(currentProvince);

  const [articles, setArticles] = useState<KnowledgeArticle[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getKnowledgeArticles()
      .then((data) => {
        if (!cancelled) setArticles(data);
      })
      .catch((err) => {
        console.error("Failed to load knowledgeArticles from Firestore", err);
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Editors flip `isFeatured` on a document in the Firestore Console to
  // change the hero card — no code change needed. If nothing is marked
  // featured, the hero card is simply hidden (no mock fallback).
  const featuredArticle = useMemo(
    () => articles?.find((article) => article.isFeatured) ?? null,
    [articles],
  );

  // Keep the featured article out of the grid below so it isn't shown twice.
  const remainingArticles = useMemo(() => {
    if (!articles) return articles;
    return featuredArticle ? articles.filter((article) => article.id !== featuredArticle.id) : articles;
  }, [articles, featuredArticle]);

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <h1 className="text-xl font-bold text-gray-900">{t("alerts.pageTitle")}</h1>

      <LegalWarningCard />
      {/* Renders nothing at all when there's no doc for the user's current
          province — see `useProvincialRegulation`'s comment. Never an
          error state or a "no regulations found" placeholder. */}
      {provincialRegulation && <ProvincialRegulationCard regulation={provincialRegulation} />}

      <NewsSearchBar value={searchQuery} onChange={setSearchQuery} />
      <CategoryFilter active={filter} onChange={setFilter} />

      {articles === null && !error ? (
        <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
      ) : featuredArticle ? (
        <FeaturedArticleCard article={featuredArticle} />
      ) : null}

      <div data-tour-id="onboarding-alerts-content" className="flex flex-col gap-4">
        <NewsFeedSection filter={filter} searchQuery={searchQuery} />

        <KnowledgeArticlesSection
          articles={remainingArticles}
          error={error}
          filter={filter}
          searchQuery={searchQuery}
        />
      </div>
    </div>
  );
}
