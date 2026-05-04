/**
 * Category metadata used by ResearchAgent search configuration controls.
 */
import iconSearchWeb from '@/components/icons/categories/icon-search-web.svg';
import iconSearchNews from '@/components/icons/categories/icon-search-news.svg';
import iconSearchVideos from '@/components/icons/categories/icon-search-videos.svg';
import iconSearchImages from '@/components/icons/categories/icon-search-images.svg';
import iconSearchAcademic from '@/components/icons/categories/icon-search-academic.svg';
import iconSearchFiles from '@/components/icons/categories/icon-search-files.svg';
import iconSearchTech from '@/components/icons/categories/icon-search-tech.svg';

export const categories = [
  {
    code: "general",
    icon: iconSearchWeb,
    name: "Web",
  },
  {
    code: "news",
    icon: iconSearchNews,
    name: "News",
  },
  {
    code: "videos",
    icon: iconSearchVideos,
    name: "Videos",
  },
  {
    code: "images",
    icon: iconSearchImages,
    name: "Images",
  },
  {
    code: "science",
    icon: iconSearchAcademic,
    name: "Academic",
  },
  {
    code: "files",
    icon: iconSearchFiles,
    name: "Files",
  },
  { code: "it", icon: iconSearchTech, name: "Tech" },
];
