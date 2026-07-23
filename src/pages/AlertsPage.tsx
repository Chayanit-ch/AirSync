import { useState } from "react";
import { NewsSearchBar } from "../components/alerts/NewsSearchBar";
import { CategoryFilter, type ArticleFilter } from "../components/alerts/CategoryFilter";
import { FeaturedArticleCard } from "../components/alerts/FeaturedArticleCard";
import { KnowledgeArticlesSection } from "../components/alerts/KnowledgeArticlesSection";
import { NewsFeedSection } from "../components/alerts/NewsFeedSection";
import { NewsletterCard } from "../components/alerts/NewsletterCard";
import { featuredArticle } from "../data/mockData";
import { useTranslation } from "../hooks/useTranslation";

export function AlertsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<ArticleFilter>("all");
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <h1 className="text-xl font-bold text-gray-900">{t("alerts.pageTitle")}</h1>

      <NewsSearchBar value={searchQuery} onChange={setSearchQuery} />
      <CategoryFilter active={filter} onChange={setFilter} />

      <FeaturedArticleCard article={featuredArticle} />

      <NewsFeedSection filter={filter} searchQuery={searchQuery} />

      <KnowledgeArticlesSection filter={filter} searchQuery={searchQuery} />

      <NewsletterCard />
    </div>
  );
}
