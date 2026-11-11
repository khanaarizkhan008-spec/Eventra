import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  QrCode,
  ShieldCheck,
  Ticket,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/utils/cn";

export function Navbar() {
  const { user, profile, isAdmin, isApprovedOrganizer, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    setMobileOpen(false);
    navigate("/");
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "text-sm font-medium transition-colors",
      isActive ? "text-white" : "text-[#A1A1AA] hover:text-white",
    );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-[#09090B]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#A78BFA]/30 bg-[#8B5CF6]/15 text-[#A78BFA]">
            <Ticket className="h-4.5 w-4.5" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-base font-bold tracking-tight text-white">Eventra</span>
            <span className="text-[10px] tracking-widest text-[#A1A1AA]">
              DISCOVER • EXPERIENCE
            </span>
          </div>
        </Link>

        {/* Desktop Links */}
        <nav className="hidden items-center gap-7 md:flex">
          <NavLink to="/events" className={navLinkClass}>
            Explore Events
          </NavLink>
          <a href="/#categories" className="text-sm font-medium text-[#A1A1AA] transition-colors hover:text-white">
            Categories
          </a>
          <NavLink to="/about" className={navLinkClass}>
            About
          </NavLink>
          {user && (
            <NavLink to="/my-registrations" className={navLinkClass}>
              My Tickets
            </NavLink>
          )}
          {isApprovedOrganizer && (
            <NavLink to="/organizer" className={navLinkClass}>
              Organizer
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin" className={navLinkClass}>
              Admin
            </NavLink>
          )}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-3 md:flex">
          {!user ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth?mode=login">Login</Link>
              </Button>
              <Button size="pill" className="h-9 px-5 text-xs" asChild>
                <Link to="/auth?mode=register">Get Started</Link>
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              {isApprovedOrganizer && (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/organizer/scanner">
                    <QrCode className="h-3.5 w-3.5 text-[#A78BFA]" />
                    Scanner
                  </Link>
                </Button>
              )}
              <Button variant="secondary" size="sm" asChild>
                <Link to="/profile">
                  <User className="h-3.5 w-3.5 text-[#A78BFA]" />
                  {profile?.full_name?.split(" ")[0] || "Account"}
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-[#141419] text-white md:hidden"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-zinc-800 bg-[#09090B] md:hidden"
          >
            <div className="flex flex-col gap-2 px-4 py-4">
              <Link
                to="/events"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-white hover:bg-[#141419]"
              >
                Explore Events
              </Link>
              <a
                href="/#categories"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-[#A1A1AA] hover:bg-[#141419] hover:text-white"
              >
                Categories
              </a>
              <Link
                to="/about"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-[#A1A1AA] hover:bg-[#141419] hover:text-white"
              >
                About
              </Link>

              {user ? (
                <>
                  <Link
                    to="/my-registrations"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-white hover:bg-[#141419]"
                  >
                    <CalendarCheck className="h-4 w-4 text-[#A78BFA]" />
                    My Tickets
                  </Link>
                  {isApprovedOrganizer && (
                    <>
                      <Link
                        to="/organizer"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-white hover:bg-[#141419]"
                      >
                        <LayoutDashboard className="h-4 w-4 text-[#A78BFA]" />
                        Organizer Dashboard
                      </Link>
                      <Link
                        to="/organizer/scanner"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-white hover:bg-[#141419]"
                      >
                        <QrCode className="h-4 w-4 text-[#A78BFA]" />
                        QR Check-In Scanner
                      </Link>
                    </>
                  )}
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-white hover:bg-[#141419]"
                    >
                      <ShieldCheck className="h-4 w-4 text-[#A78BFA]" />
                      Admin Dashboard
                    </Link>
                  )}
                  <Link
                    to="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-white hover:bg-[#141419]"
                  >
                    <User className="h-4 w-4 text-[#A78BFA]" />
                    Profile Settings
                  </Link>
                  <Button variant="outline" className="mt-2 w-full" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button variant="secondary" asChild onClick={() => setMobileOpen(false)}>
                    <Link to="/auth?mode=login">Login</Link>
                  </Button>
                  <Button asChild onClick={() => setMobileOpen(false)}>
                    <Link to="/auth?mode=register">Get Started</Link>
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

