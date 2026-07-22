import { useMemo, useState } from "react";
import { NewsSearchBar } from "../components/alerts/NewsSearchBar";
import { CategoryFilter, type ArticleFilter } from "../components/alerts/CategoryFilter";
import { FeaturedArticleCard } from "../components/alerts/FeaturedArticleCard";
import { ArticleListItem } from "../components/alerts/ArticleListItem";
import { NewsFeedSection } from "../components/alerts/NewsFeedSection";
import { NewsletterCard } from "../components/alerts/NewsletterCard";
import { featuredArticle, knowledgeArticles } from "../data/mockData";
import { useTranslation } from "../hooks/useTranslation";

export function AlertsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<ArticleFilter>("all");
  const { t } = useTranslation();

  const visibleArticles = useMemo(() => {
    return knowledgeArticles.filter((article) => {
      const matchesFilter = filter === "all" || article.category === filter;
      const matchesSearch = article.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [filter, searchQuery]);

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <h1 className="text-xl font-bold text-gray-900">{t("alerts.pageTitle")}</h1>

      <NewsSearchBar value={searchQuery} onChange={setSearchQuery} />
      <CategoryFilter active={filter} onChange={setFilter} />

      <FeaturedArticleCard article={featuredArticle} />

      <NewsFeedSection filter={filter} searchQuery={searchQuery} />

      <div>
        <h2 className="border-brand-600 mb-3 border-l-4 pl-2.5 text-lg font-bold text-gray-800">
          {t("alerts.knowledgeArticles")}
        </h2>
        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-3">
          {visibleArticles.map((article) => (
            <ArticleListItem key={article.id} article={article} />
          ))}
        </div>
      </div>

      <NewsletterCard />
    </div>
  );
}
