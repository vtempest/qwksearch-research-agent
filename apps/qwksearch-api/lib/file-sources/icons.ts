// Utility to map file extensions and names to icon classes
export function getFileIcon(fileName: string, isFolder: boolean): string {
  if (isFolder) {
    return "icon-file-directory"
  }

  const ext = fileName.split(".").pop()?.toLowerCase()
  const name = fileName.toLowerCase()

  // Special file names
  if (name === "package.json") return "package-icon"
  if (name === "tsconfig.json") return "json-icon"
  if (name === "readme.md") return "markdown-icon"
  if (name === ".gitignore") return "git-icon"
  if (name === "dockerfile") return "docker-icon"
  if (name === "makefile") return "checklist-icon"
  if (name === "license") return "key-icon"

  // Extensions
  switch (ext) {
    // JavaScript/TypeScript
    case "js":
    case "mjs":
    case "cjs":
      return "js-icon"
    case "jsx":
      return "react-icon"
    case "ts":
      return "ts-icon"
    case "tsx":
      return "react-icon"
    case "json":
      return "json-icon"

    // Web
    case "html":
    case "htm":
      return "html5-icon"
    case "css":
      return "css3-icon"
    case "scss":
    case "sass":
      return "sass-icon"
    case "less":
      return "less-icon"

    // Images
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "bmp":
    case "webp":
      return "image-icon"
    case "svg":
      return "svg-icon"
    case "ico":
      return "image-icon"

    // Documents
    case "md":
    case "markdown":
      return "markdown-icon"
    case "txt":
      return "text-icon"
    case "pdf":
      return "pdf-icon"

    // Programming Languages
    case "py":
      return "python-icon"
    case "java":
      return "java-icon"
    case "c":
      return "c-icon"
    case "cpp":
    case "cc":
    case "cxx":
      return "cpp-icon"
    case "cs":
      return "csharp-icon"
    case "go":
      return "go-icon"
    case "rs":
      return "rust-icon"
    case "php":
      return "php-icon"
    case "rb":
      return "ruby-icon"
    case "swift":
      return "swift-icon"
    case "kt":
    case "kts":
      return "kotlin-icon"
    case "scala":
      return "scala-icon"
    case "clj":
    case "cljs":
      return "clojure-icon"
    case "hs":
      return "haskell-icon"
    case "ex":
    case "exs":
      return "elixir-icon"
    case "erl":
      return "erlang-icon"
    case "lua":
      return "lua-icon"
    case "pl":
    case "pm":
      return "perl-icon"

    // Data/Config
    case "xml":
      return "xml-icon"
    case "yaml":
    case "yml":
      return "yml-icon"
    case "toml":
      return "config-icon"
    case "ini":
      return "config-icon"
    case "env":
      return "config-icon"
    case "sql":
      return "sql-icon"
    case "db":
    case "sqlite":
      return "database-icon"

    // Archives
    case "zip":
    case "rar":
    case "7z":
    case "tar":
    case "gz":
      return "zip-icon"

    // Other
    case "sh":
    case "bash":
    case "zsh":
      return "terminal-icon"
    case "vue":
      return "vue-icon"
    case "dart":
      return "dart-icon"
    case "graphql":
    case "gql":
      return "graphql-icon"

    default:
      return "default-icon"
  }
}
