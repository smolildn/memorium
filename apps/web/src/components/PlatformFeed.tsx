import { formatDate, type MemoryItem } from "../api";
import {
  formatChatDate,
  formatChatTime,
  getInitials,
  getSenderName,
  groupByDay,
  isFromSubject,
  type SourceTheme,
} from "../sourceThemes";
import { mediaUrl } from "../mediaUrl";

interface Props {
  item: MemoryItem;
  theme: SourceTheme;
  subjectName: string;
}

export function PlatformMemoryCard({ item, theme, subjectName }: Props) {
  switch (theme.layout) {
    case "chat":
      return <ChatBubble item={item} theme={theme} subjectName={subjectName} />;
    case "facebook":
      return <FacebookPost item={item} subjectName={subjectName} />;
    case "instagram":
      return <InstagramPost item={item} subjectName={subjectName} />;
    case "email":
      return <EmailRow item={item} />;
    default:
      return null;
  }
}

interface FeedProps {
  items: MemoryItem[];
  theme: SourceTheme;
  subjectName: string;
}

export function PlatformFeed({ items, theme, subjectName }: FeedProps) {
  const sorted = [...items].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );

  if (theme.layout === "chat") {
    const dayGroups = groupByDay(sorted);
    return (
      <div className="platform-chat-thread">
        {dayGroups.map((group) => (
          <div key={group.date} className="platform-chat-day">
            <div className="platform-chat-date">{formatChatDate(group.items[0]!.occurredAt)}</div>
            {group.items.map((item) => (
              <PlatformMemoryCard
                key={item.id}
                item={item}
                theme={theme}
                subjectName={subjectName}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`platform-feed platform-feed--${theme.layout}`}>
      {sorted.map((item) => (
        <PlatformMemoryCard
          key={item.id}
          item={item}
          theme={theme}
          subjectName={subjectName}
        />
      ))}
    </div>
  );
}

function ChatBubble({ item, theme, subjectName }: Props) {
  const outgoing = isFromSubject(item, subjectName);
  const sender = getSenderName(item);
  const chatName =
    typeof item.metadata.chat === "string" ? item.metadata.chat : sender;

  return (
    <div
      className={`platform-bubble ${outgoing ? "platform-bubble--out" : "platform-bubble--in"}`}
      data-platform={theme.id}
    >
      {!outgoing && (
        <div className="platform-bubble-avatar" aria-hidden="true">
          {getInitials(sender)}
        </div>
      )}
      <div className="platform-bubble-body">
        {!outgoing && theme.id === "whatsapp" && (
          <span className="platform-bubble-sender">{sender}</span>
        )}
        {item.text && <p>{item.text}</p>}
        <time dateTime={item.occurredAt} className="platform-bubble-time">
          {formatChatTime(item.occurredAt)}
          {outgoing && theme.id === "whatsapp" && <span className="platform-ticks"> ✓✓</span>}
        </time>
      </div>
      {outgoing && theme.id === "meta_messenger" && (
        <div className="platform-bubble-avatar platform-bubble-avatar--self" aria-hidden="true">
          {getInitials(subjectName)}
        </div>
      )}
      {!outgoing && theme.id === "meta_messenger" && (
        <span className="sr-only">Message from {chatName}</span>
      )}
    </div>
  );
}

function FacebookPost({ item, subjectName }: Omit<Props, "theme">) {
  const reactions =
    typeof item.metadata.reactions === "number" ? item.metadata.reactions : null;

  return (
    <article className="platform-fb-post">
      <header className="platform-fb-header">
        <div className="platform-fb-avatar">{getInitials(subjectName)}</div>
        <div>
          <strong>{subjectName}</strong>
          <time dateTime={item.occurredAt}>{formatDate(item.occurredAt)} · 🌎</time>
        </div>
      </header>
      {item.text && <p className="platform-fb-text">{item.text}</p>}
      {item.mediaRefs && item.mediaRefs.length > 0 && (
        <div className="platform-fb-media">
          {item.mediaRefs.map((ref) => (
            <img key={ref.id ?? ref.vaultPath} src={mediaUrl(ref)} alt="" loading="lazy" />
          ))}
        </div>
      )}
      <footer className="platform-fb-footer">
        <span>{reactions !== null ? `👍 ${reactions}` : "👍 Like"}</span>
        <span>💬 Comment</span>
        <span>↗ Share</span>
      </footer>
    </article>
  );
}

function InstagramPost({ item, subjectName }: Omit<Props, "theme">) {
  const likes = typeof item.metadata.likes === "number" ? item.metadata.likes : null;

  return (
    <article className="platform-ig-post">
      <header className="platform-ig-header">
        <div className="platform-ig-avatar-ring">
          <div className="platform-ig-avatar">{getInitials(subjectName)}</div>
        </div>
        <strong>{subjectName.split(" ")[0]?.toLowerCase() ?? "rose"}</strong>
      </header>
      {item.mediaRefs && item.mediaRefs.length > 0 ? (
        <div className="platform-ig-media">
          {item.mediaRefs.map((ref) => (
            <img key={ref.id ?? ref.vaultPath} src={mediaUrl(ref)} alt="" loading="lazy" />
          ))}
        </div>
      ) : (
        <div className="platform-ig-media platform-ig-media--placeholder">
          <span>{item.title ?? "Photo"}</span>
        </div>
      )}
      <div className="platform-ig-actions">
        <span>♥</span>
        <span>💬</span>
        <span>✈</span>
      </div>
      {likes !== null && <p className="platform-ig-likes">{likes.toLocaleString()} likes</p>}
      <p className="platform-ig-caption">
        <strong>{subjectName.split(" ")[0]?.toLowerCase()}</strong> {item.text}
      </p>
      <time dateTime={item.occurredAt} className="platform-ig-time">
        {formatDate(item.occurredAt)}
      </time>
    </article>
  );
}

function EmailRow({ item }: { item: MemoryItem }) {
  const from =
    typeof item.metadata.from === "string" ? item.metadata.from : getSenderName(item);
  const to = typeof item.metadata.to === "string" ? item.metadata.to : "";

  return (
    <article className="platform-email">
      <header className="platform-email-header">
        <div className="platform-email-avatar">{getInitials(from.split("@")[0] ?? "R")}</div>
        <div className="platform-email-meta">
          <div className="platform-email-from">
            <strong>{from}</strong>
            <time dateTime={item.occurredAt}>{formatDate(item.occurredAt)}</time>
          </div>
          {to && <span className="platform-email-to">to {to}</span>}
          {item.title && <h3>{item.title}</h3>}
        </div>
      </header>
      <div className="platform-email-body">{item.text}</div>
    </article>
  );
}

export function PlatformChrome({ theme, subjectName }: { theme: SourceTheme; subjectName: string }) {
  if (theme.layout === "chat") {
    return (
      <div className="platform-chrome platform-chrome--chat">
        <div className="platform-chrome-back" aria-hidden="true">‹</div>
        <div className="platform-chrome-center">
          <div className="platform-chrome-avatar">{getInitials(subjectName)}</div>
          <div>
            <strong>{subjectName}</strong>
            <span>{theme.label}</span>
          </div>
        </div>
        <div className="platform-chrome-actions" aria-hidden="true">📞 · 📹</div>
      </div>
    );
  }

  if (theme.layout === "facebook") {
    return (
      <div className="platform-chrome platform-chrome--facebook">
        <span className="platform-logo-fb">facebook</span>
        <div className="platform-chrome-search">Search Facebook</div>
      </div>
    );
  }

  if (theme.layout === "instagram") {
    return (
      <div className="platform-chrome platform-chrome--instagram">
        <span className="platform-logo-ig">Instagram</span>
        <div className="platform-chrome-icons" aria-hidden="true">♡ ＋</div>
      </div>
    );
  }

  if (theme.layout === "email") {
    return (
      <div className="platform-chrome platform-chrome--email">
        <span>☰</span>
        <span className="platform-logo-email">Mail</span>
        <span>🔍</span>
      </div>
    );
  }

  return null;
}
