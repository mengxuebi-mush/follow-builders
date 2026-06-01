import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const TIME_ZONE = "America/Los_Angeles";
const SCHEMA_VERSION = 1;
const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const archiveRoot = join(projectRoot, "public", "archive");
const daysDir = join(archiveRoot, "days");
const skillDir =
  process.env.FOLLOW_BUILDERS_SKILL_DIR ??
  join(homedir(), ".codex", "skills", "follow-builders");
const skillScriptsDir = join(skillDir, "scripts");

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value = "true"] = arg.replace(/^--/, "").split("=");
    return [key, value];
  }),
);

const requestedDate = args.get("date");
const archiveDate = requestedDate ?? getYesterdayInTimeZone(TIME_ZONE);

function getYesterdayInTimeZone(timeZone) {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return formatDateInTimeZone(yesterday, timeZone);
}

function formatDateInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function hash(value) {
  return createHash("sha1").update(value).digest("hex").slice(0, 12);
}

function makeSnippetId(date, sourceType, url) {
  return `${date}-${sourceType}-${hash(url)}`;
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/Speaker\s+\d+\s+\|\s+\d+:\d+\s+-\s+\d+:\d+/g, " ")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function sentenceLimit(value, maxLength) {
  const clean = cleanText(value);
  if (clean.length <= maxLength) {
    return clean;
  }

  const clipped = clean.slice(0, maxLength);
  const sentenceEnd = Math.max(
    clipped.lastIndexOf("."),
    clipped.lastIndexOf("!"),
    clipped.lastIndexOf("?"),
  );

  if (sentenceEnd > maxLength * 0.55) {
    return clipped.slice(0, sentenceEnd + 1).trim();
  }

  return `${clipped.replace(/\s+\S*$/, "").trim()}...`;
}

function splitSentences(value) {
  return cleanText(value)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 30);
}

function selectKeySentences(value, keywords, limit = 3) {
  const sentences = splitSentences(value);
  const selected = [];

  for (const keyword of keywords) {
    const match = sentences.find(
      (sentence) =>
        sentence.toLowerCase().includes(keyword) &&
        !selected.includes(sentence),
    );
    if (match) {
      selected.push(match);
    }
    if (selected.length >= limit) {
      break;
    }
  }

  return selected.length > 0
    ? selected.join(" ")
    : sentences.slice(0, limit).join(" ");
}

const tagPatterns = [
  ["agents", /\bagent|agentic|workflow|autonomous/i],
  ["coding", /\bcodex|cursor|code|developer|engineering|programming/i],
  ["enterprise", /\benterprise|cio|procurement|customer|global|company/i],
  ["models", /\bmodel|llm|gpt|claude|opus|frontier|inference/i],
  ["costs", /\btoken|cost|budget|compute|pricing|finops/i],
  ["product", /\bproduct|launch|feature|design|prototype/i],
  ["research", /\bresearch|benchmark|eval|paper|architecture/i],
  ["tools", /\btool|api|mcp|platform|app/i],
];

const entityPatterns = [
  "OpenAI",
  "Anthropic",
  "Claude",
  "Codex",
  "Cursor",
  "Vercel",
  "Replit",
  "Google",
  "Microsoft",
  "Meta",
  "Box",
  "Perplexity",
  "Supabase",
];

function extractTags(text) {
  const tags = tagPatterns
    .filter(([, pattern]) => pattern.test(text))
    .map(([tag]) => tag);
  return tags.length > 0 ? Array.from(new Set(tags)).slice(0, 5) : ["ai"];
}

function extractEntities(text, fallback = []) {
  const entities = entityPatterns.filter((entity) =>
    new RegExp(`\\b${entity}\\b`, "i").test(text),
  );
  return Array.from(new Set([...fallback, ...entities])).slice(0, 8);
}

function sourceCounts(snippets) {
  return snippets.reduce(
    (counts, snippet) => {
      counts[snippet.sourceType] += 1;
      return counts;
    },
    { x: 0, podcast: 0, blog: 0 },
  );
}

function createXSnippets(feed, date, generatedAt) {
  return (feed.x ?? [])
    .filter((builder) => Array.isArray(builder.tweets) && builder.tweets.length > 0)
    .map((builder) => {
      const rankedTweets = [...builder.tweets].sort(
        (left, right) => (right.likes ?? 0) - (left.likes ?? 0),
      );
      const leadTweet = rankedTweets.find((tweet) => tweet.url) ?? rankedTweets[0];
      if (!leadTweet?.url) {
        return null;
      }

      const combinedTweets = rankedTweets
        .slice(0, 3)
        .map((tweet) => cleanText(tweet.text))
        .filter(Boolean)
        .join(" ");
      const titleTopic = extractTags(combinedTweets).slice(0, 2).join(" and ");
      const title = `${builder.name} on ${titleTopic || "AI builder signals"}`;
      const handleText = builder.handle ? `${builder.name} (${builder.handle} on X)` : builder.name;

      return {
        id: makeSnippetId(date, "x", leadTweet.url),
        date,
        sourceType: "x",
        sourceName: "X",
        authorName: builder.name,
        title,
        takeaway: sentenceLimit(combinedTweets, 180),
        summary: `${handleText} shared ${builder.tweets.length} recent update${
          builder.tweets.length === 1 ? "" : "s"
        }. ${sentenceLimit(combinedTweets, 420)}`,
        url: leadTweet.url,
        publishedAt: leadTweet.createdAt,
        tags: extractTags(`${builder.bio ?? ""} ${combinedTweets}`),
        entities: extractEntities(combinedTweets, [builder.name]),
        createdAt: generatedAt,
      };
    })
    .filter(Boolean);
}

function createPodcastSnippets(feed, date, generatedAt) {
  return (feed.podcasts ?? [])
    .filter((podcast) => podcast.url)
    .map((podcast) => {
      const body = cleanText(podcast.transcript);
      const titleText = cleanText(podcast.title);
      const combined = `${titleText} ${body}`;
      const keyText = selectKeySentences(body, [
        "agent",
        "enterprise",
        "token",
        "budget",
        "workflow",
        "productivity",
        "startup",
        "model",
      ]);
      const hasEnterpriseAgentFrame =
        /enterprise/i.test(combined) &&
        /agent/i.test(combined) &&
        /token|budget|cost/i.test(combined);
      const takeaway = hasEnterpriseAgentFrame
        ? "Enterprise AI is moving from chat rollout toward agentic workflows, with token budgets, rollout speed, and workflow integration becoming the practical bottlenecks."
        : sentenceLimit(`${titleText}. ${keyText}`, titleText.length > 90 ? 220 : 180);
      const summary = sentenceLimit(keyText, 520);

      return {
        id: makeSnippetId(date, "podcast", podcast.url),
        date,
        sourceType: "podcast",
        sourceName: podcast.name,
        title: titleText,
        takeaway,
        summary,
        url: podcast.url,
        publishedAt: podcast.publishedAt,
        tags: extractTags(combined),
        entities: extractEntities(combined, [podcast.name]),
        createdAt: generatedAt,
      };
    });
}

function createBlogSnippets(feed, date, generatedAt) {
  return (feed.blogs ?? [])
    .filter((blog) => blog.url)
    .map((blog) => {
      const text = cleanText(`${blog.title ?? ""}. ${blog.content ?? blog.summary ?? ""}`);

      return {
        id: makeSnippetId(date, "blog", blog.url),
        date,
        sourceType: "blog",
        sourceName: blog.name ?? blog.sourceName ?? "Official blog",
        authorName: blog.author,
        title: cleanText(blog.title ?? "Official AI company update"),
        takeaway: sentenceLimit(text, 180),
        summary: sentenceLimit(text, 460),
        url: blog.url,
        publishedAt: blog.publishedAt,
        tags: extractTags(text),
        entities: extractEntities(text, [blog.name ?? blog.sourceName].filter(Boolean)),
        createdAt: generatedAt,
      };
    });
}

async function loadFeed() {
  const result = spawnSync("node", ["prepare-digest.js"], {
    cwd: skillScriptsDir,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 12,
  });

  if (result.status === 0 && result.stdout.trim()) {
    return JSON.parse(result.stdout);
  }

  const fallback = await loadLocalSkillFeeds();
  fallback.errors = [
    "prepare-digest.js failed; used local follow-builders feed files as fallback.",
  ];
  return fallback;
}

async function loadLocalSkillFeeds() {
  const [xFeed, podcastFeed, blogFeed] = await Promise.all([
    readJson(join(skillDir, "feed-x.json")),
    readJson(join(skillDir, "feed-podcasts.json")),
    readJson(join(skillDir, "feed-blogs.json")),
  ]);

  return {
    status: "ok",
    generatedAt: new Date().toISOString(),
    config: { language: "en", delivery: { method: "stdout" } },
    x: xFeed.x ?? [],
    podcasts: podcastFeed.podcasts ?? [],
    blogs: blogFeed.blogs ?? [],
    stats: {
      podcastEpisodes: podcastFeed.podcasts?.length ?? 0,
      xBuilders: xFeed.x?.length ?? 0,
      totalTweets: (xFeed.x ?? []).reduce(
        (total, builder) => total + (builder.tweets?.length ?? 0),
        0,
      ),
      blogPosts: blogFeed.blogs?.length ?? 0,
      feedGeneratedAt:
        xFeed.generatedAt ?? podcastFeed.generatedAt ?? blogFeed.generatedAt,
    },
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function buildSearchIndex(generatedAt) {
  const files = existsSync(daysDir)
    ? (await readdir(daysDir)).filter((file) => file.endsWith(".json")).sort()
    : [];
  const snippets = [];

  for (const file of files) {
    const day = await readJson(join(daysDir, file));
    snippets.push(...(day.snippets ?? []));
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    snippets: snippets.sort((left, right) => right.date.localeCompare(left.date)),
  };
}

async function upsertManifest(day, generatedAt) {
  const manifestPath = join(archiveRoot, "manifest.json");
  const existing = existsSync(manifestPath)
    ? await readJson(manifestPath)
    : { schemaVersion: SCHEMA_VERSION, days: [] };

  const summary = {
    date: day.date,
    title: `Issue ${day.date}`,
    snippetCount: day.snippets.length,
    sourceCounts: sourceCounts(day.snippets),
    generatedAt: day.generatedAt,
  };

  const days = [
    summary,
    ...(existing.days ?? []).filter((entry) => entry.date !== day.date),
  ].sort((left, right) => right.date.localeCompare(left.date));

  await writeJson(manifestPath, {
    schemaVersion: SCHEMA_VERSION,
    days,
    generatedAt,
  });
}

async function main() {
  const feed = await loadFeed();
  const generatedAt = new Date().toISOString();
  const snippets = [
    ...createXSnippets(feed, archiveDate, generatedAt),
    ...createBlogSnippets(feed, archiveDate, generatedAt),
    ...createPodcastSnippets(feed, archiveDate, generatedAt),
  ];

  const day = {
    schemaVersion: SCHEMA_VERSION,
    date: archiveDate,
    generatedAt,
    feedGeneratedAt: feed.stats?.feedGeneratedAt ?? feed.generatedAt,
    snippets,
  };

  await writeJson(join(daysDir, `${archiveDate}.json`), day);
  await upsertManifest(day, generatedAt);
  await writeJson(join(archiveRoot, "search-index.json"), await buildSearchIndex(generatedAt));

  console.log(
    `Captured ${snippets.length} snippets for ${archiveDate} in ${join(
      archiveRoot,
      "days",
      `${archiveDate}.json`,
    )}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
