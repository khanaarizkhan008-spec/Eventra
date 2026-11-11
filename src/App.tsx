import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { AuthProvider } from "@/hooks/useAuth";
import { ToastProvider } from "@/hooks/useToast";
import { PublicLayout } from "@/layouts/PublicLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { HomePage } from "@/pages/HomePage";
import { EventsPage } from "@/pages/EventsPage";
import { EventDetailPage } from "@/pages/EventDetailPage";
import { AuthPage } from "@/pages/AuthPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { MyRegistrationsPage } from "@/pages/MyRegistrationsPage";
import { TicketPage } from "@/pages/TicketPage";
import { PaymentStatusPage } from "@/pages/PaymentStatusPage";
import { OrganizerDashboardPage } from "@/pages/OrganizerDashboardPage";
import { OrganizerEventFormPage } from "@/pages/OrganizerEventFormPage";
import { OrganizerScannerPage } from "@/pages/OrganizerScannerPage";
import { AdminDashboardPage } from "@/pages/AdminDashboardPage";
import { AboutPage } from "@/pages/AboutPage";
import { LegalPage } from "@/pages/LegalPage";
import { DemoComponentPage } from "@/pages/DemoComponentPage";

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route
                path="/"
                element={
                  <PublicLayout introMode>
                    <HomePage />
                  </PublicLayout>
                }
              />
              <Route
                path="/events"
                element={
                  <PublicLayout>
                    <EventsPage />
                  </PublicLayout>
                }
              />
              <Route
                path="/events/:slugOrId"
                element={
                  <PublicLayout>
                    <EventDetailPage />
                  </PublicLayout>
                }
              />
              <Route
                path="/about"
                element={
                  <PublicLayout>
                    <AboutPage />
                  </PublicLayout>
                }
              />
              <Route
                path="/privacy"
                element={
                  <PublicLayout>
                    <LegalPage type="privacy" />
                  </PublicLayout>
                }
              />
              <Route
                path="/terms"
                element={
                  <PublicLayout>
                    <LegalPage type="terms" />
                  </PublicLayout>
                }
              />
              <Route
                path="/refund-policy"
                element={
                  <PublicLayout>
                    <LegalPage type="refund" />
                  </PublicLayout>
                }
              />
              <Route
                path="/contact"
                element={
                  <PublicLayout>
                    <LegalPage type="contact" />
                  </PublicLayout>
                }
              />
              <Route path="/demo/curtain-split-hero" element={<DemoComponentPage />} />

              {/* Authentication */}
              <Route
                path="/auth"
                element={
                  <PublicLayout>
                    <AuthPage />
                  </PublicLayout>
                }
              />
              <Route
                path="/forgot-password"
                element={
                  <PublicLayout>
                    <ForgotPasswordPage />
                  </PublicLayout>
                }
              />
              <Route
                path="/reset-password"
                element={
                  <PublicLayout>
                    <ResetPasswordPage />
                  </PublicLayout>
                }
              />

              {/* Authenticated Participant Routes */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-registrations"
                element={
                  <ProtectedRoute>
                    <MyRegistrationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tickets/:ticketId"
                element={
                  <ProtectedRoute>
                    <PublicLayout>
                      <TicketPage />
                    </PublicLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payment-status"
                element={
                  <ProtectedRoute>
                    <PublicLayout>
                      <PaymentStatusPage />
                    </PublicLayout>
                  </ProtectedRoute>
                }
              />

              {/* Organizer Dashboard Routes */}
              <Route
                path="/organizer"
                element={
                  <ProtectedRoute requireRole="organizer">
                    <OrganizerDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organizer/events/new"
                element={
                  <ProtectedRoute requireRole="organizer">
                    <OrganizerEventFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organizer/events/:eventId/edit"
                element={
                  <ProtectedRoute requireRole="organizer">
                    <OrganizerEventFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organizer/scanner"
                element={
                  <ProtectedRoute requireRole="organizer">
                    <OrganizerScannerPage />
                  </ProtectedRoute>
                }
              />

              {/* Platform Admin Route */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireRole="admin">
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </MotionConfig>
  );
}

export default App;

