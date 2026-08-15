import AdminAccountSettingsCard from "@/components/admin/AdminAccountSettingsCard";
import AdminLocalDataBackupCard from "@/components/admin/AdminLocalDataBackupCard";
import AdminTeamAccessCard from "@/components/admin/AdminTeamAccessCard";

export const metadata = {
  title: "Settings",
};

export default function AdminSettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="border-b border-zinc-200/80 pb-5 dark:border-zinc-700/80">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Settings</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Manage admin login credentials, grant team access, and export offline workshop data backups.
        </p>
      </header>
      <AdminLocalDataBackupCard />
      <AdminTeamAccessCard />
      <AdminAccountSettingsCard />
    </div>
  );
}
