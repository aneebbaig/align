import { requireUser } from "@/lib/session";
import { getUserSettings } from "@/actions/settings";
import { getNotifications } from "@/actions/notifications";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Header } from "@/components/layout/header";
import { DateLangSetter } from "@/components/shared/date-lang-setter";

function dateLang(fmt: string): string {
  if (fmt.startsWith("MM/dd")) return "en-US";
  if (fmt.startsWith("yyyy")) return "sv";
  return "en-GB";
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, settings, notifications] = await Promise.all([
    requireUser(),
    getUserSettings(),
    getNotifications(),
  ]);
  const lang = dateLang(settings?.dateFormat ?? "dd/MM/yyyy");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DateLangSetter lang={lang} />
      <Sidebar role={user.role} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header user={user} notifications={notifications} />
        <main className="flex-1 overflow-y-auto p-5 md:p-8 pb-24 md:pb-8 animate-fade-in">
          {children}
        </main>
      </div>
      <MobileNav role={user.role} />
    </div>
  );
}
