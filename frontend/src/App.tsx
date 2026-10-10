import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import PublicStudio from "@/pages/PublicStudio";
import AdminLayout from "@/pages/admin/AdminLayout";
import Dashboard from "@/pages/admin/Dashboard";
import AppointmentsAdmin from "@/pages/admin/AppointmentsAdmin";
import ServicesAdmin from "@/pages/admin/ServicesAdmin";
import ProfessionalsAdmin from "@/pages/admin/ProfessionalsAdmin";
import ScheduleAdmin from "@/pages/admin/ScheduleAdmin";
import SettingsAdmin from "@/pages/admin/SettingsAdmin";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="appointments" element={<AppointmentsAdmin />} />
          <Route path="services" element={<ServicesAdmin />} />
          <Route path="professionals" element={<ProfessionalsAdmin />} />
          <Route path="schedule" element={<ScheduleAdmin />} />
          <Route path="settings" element={<SettingsAdmin />} />
        </Route>
        <Route path="/b/:slug" element={<PublicStudio />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster richColors />
    </>
  );
}
