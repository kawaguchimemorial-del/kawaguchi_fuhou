import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicMemorial } from "@/lib/memorial/data";
import { formatJpTime, isPast } from "@/lib/format";
import { TestBanner, GoldButton, ShareRow, SiteFooter } from "@/components/guest/parts";
import type { Memorial } from "@/lib/memorial/types";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const m = await getPublicMemorial(slug);
  if (!m) return { title: "訃報案内", robots: { index: false, follow: false } };
  const index = m.accessLevel === "public" && !m.noindex;
  return {
    title: `${m.deceased.nameKanji} 様 訃報のお知らせ`,
    robots: { index, follow: index },
  };
}

export default async function ObituaryPage({ params }: Params) {
  const { slug } = await params;
  const m = await getPublicMemorial(slug);
  if (!m) notFound();

  const shareUrl = `https://example.com/m/${m.slug}`;
  const flowerOpen = !m.flowerDecline && !isPast(m.offeringAcceptUntil);

  return (
    <div className="min-h-screen pb-24">
      {m.testMode && <TestBanner />}

      <ObituaryHero m={m} />

      <main className="mx-auto max-w-xl px-5">
        <SectionTitle>記</SectionTitle>
        {m.events.map((e) => (
          <EventCard key={e.id} m={m} event={e} />
        ))}

        <RitualRow label="儀式形態" value={m.religionType} />

        {m.venue && <VenueGuide m={m} />}

        <ShareRow url={shareUrl} title={`${m.deceased.nameKanji} 様 訃報のお知らせ`} />

        {m.funeralHomeName && <PurveyorBlock m={m} />}
      </main>

      <SiteFooter />

      {flowerOpen && <OrderBar m={m} />}
    </div>
  );
}

function ObituaryHero({ m }: { m: Memorial }) {
  const d = m.deceased;
  return (
    <header className="relative overflow-hidden bg-[#efe9da]">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(circle at 80% 30%, #ffffff 0%, #efe9da 60%)",
        }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-xl px-6 py-12">
        <div className="border-2 border-[var(--accent)] bg-white/70 px-6 py-10 text-center">
          <h1 className="font-serif text-3xl tracking-[0.4em] text-[var(--primary)]">
            {m.obituaryTitle}
          </h1>
          <p className="mt-6 font-serif text-lg">故 {d.nameKana ?? d.nameKanji} 儀</p>
          {m.obituaryBody && (
            <div className="mt-3 space-y-1 font-serif leading-loose text-[var(--foreground)]">
              {m.obituaryBody.split("\n").map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          )}
          {m.chiefMourner && (
            <p className="mt-6 font-serif">喪主 {m.chiefMourner.nameKanji}</p>
          )}
        </div>
      </div>
    </header>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-12 mb-4 text-center font-serif text-2xl tracking-widest text-[var(--primary)]">
      {children}
      <span className="mx-auto mt-2 block h-px w-16 bg-[var(--accent)]" />
    </h2>
  );
}

function EventCard({ m, event: e }: { m: Memorial; event: Memorial["events"][number] }) {
  const dt =
    e.datetimeLabel ??
    (e.startAt
      ? `${formatJpTime(e.startAt)}${e.endAt ? ` 〜 ${formatJpTime(e.endAt)}` : " 〜"}`
      : "日程調整中");
  return (
    <section className="mb-6 bg-[var(--card)] px-6 py-6">
      <h3 className="mb-5 text-center font-serif text-xl text-[var(--primary)]">
        {e.eventType === "葬儀" ? (m.events.length === 1 ? "一日葬" : "葬儀") : e.eventType}
        <span className="mx-auto mt-2 block h-px w-10 bg-[var(--accent)]" />
      </h3>
      <Row label="日時" value={dt} />
      {(e.venueName || e.venueAddress) && (
        <div className="mt-4 flex gap-6">
          <span className="shrink-0 text-sm text-[var(--muted)]">式場</span>
          <div className="text-sm">
            {e.venueName && <p className="font-medium">{e.venueName}</p>}
            {e.venueAddress && <p className="text-[var(--muted)]">{e.venueAddress}</p>}
            {m.funeralHomeContact?.phone && (
              <p className="mt-1 text-[var(--muted)]">{m.funeralHomeContact.phone}</p>
            )}
            {m.funeralHomeContact?.url && (
              <a href={m.funeralHomeContact.url} className="text-[var(--accent)]">
                {m.funeralHomeContact.url}
              </a>
            )}
            {e.mapUrl && (
              <div className="mt-3">
                <a
                  href={e.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-sm border border-[var(--accent)] px-4 py-2 text-[var(--accent)]"
                >
                  GoogleMapを開く
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-6">
      <span className="shrink-0 text-sm text-[var(--muted)]">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function RitualRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-6 flex gap-6 bg-[var(--card)] px-6 py-4">
      <span className="shrink-0 text-sm text-[var(--muted)]">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function VenueGuide({ m }: { m: Memorial }) {
  const v = m.venue!;
  return (
    <section className="mb-6 bg-[#edeaf0] px-6 py-8 text-center">
      <h3 className="font-serif text-lg text-[var(--primary)]">オンライン式場のご案内</h3>
      <p className="mt-3 text-left text-sm leading-relaxed text-[var(--muted)]">
        オンライン式場にて、ご記帳いただくことができます。ご記帳いただくことで、写真・メッセージを喪主へお送りいただけます。
      </p>
      {v.openFrom && v.openUntil && (
        <div className="mt-5 border-l-2 border-[var(--accent)] pl-3 text-left">
          <p className="text-sm font-medium text-[var(--primary)]">公開期間</p>
          <p className="text-sm text-[var(--muted)]">
            {new Date(v.openFrom).toLocaleDateString("ja-JP")} 〜{" "}
            {new Date(v.openUntil).toLocaleDateString("ja-JP")}
            {v.openDays ? `（${v.openDays}日間）` : ""}
          </p>
        </div>
      )}
      <div className="mt-6">
        <GoldButton href={`/m/${m.slug}/venue`}>オンライン式場　›</GoldButton>
      </div>
    </section>
  );
}

function PurveyorBlock({ m }: { m: Memorial }) {
  const c = m.funeralHomeContact;
  return (
    <section className="my-8 border px-6 py-6">
      <div className="flex gap-8">
        <span className="shrink-0 text-[var(--primary)]">御用達</span>
        <div className="text-sm text-[var(--muted)]">
          <p>{m.funeralHomeName}</p>
          {c?.phone && <p className="text-[var(--accent)]">{c.phone}</p>}
          {c?.email && <p className="text-[var(--accent)]">{c.email}</p>}
          {c?.url && <p className="text-[var(--accent)]">{c.url}</p>}
        </div>
      </div>
    </section>
  );
}

function OrderBar({ m }: { m: Memorial }) {
  const until = m.offeringAcceptUntil
    ? new Date(m.offeringAcceptUntil).toLocaleString("ja-JP", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-xl items-stretch border-t bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
      <div className="flex flex-1 items-center px-5 text-sm">
        <span className="text-[var(--muted)]">供花：{until} まで</span>
      </div>
      <a
        href={`/m/${m.slug}/flower`}
        className="flex items-center bg-[var(--accent)] px-6 py-4 text-center text-sm leading-tight text-white"
      >
        ご注文は
        <br />
        こちら　›
      </a>
    </nav>
  );
}
