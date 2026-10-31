import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Pencil, Save, X, MapPin, Phone, Mail, Calendar,
  Briefcase, CreditCard, Shield, CheckCircle2, AlertCircle,
  ChevronDown,
} from "lucide-react";
import AnimatedPage from "../../components/common/AnimatedPage";
import PageHeader from "../../components/layout/PageHeader";
import Loading from "../../components/common/Loading";
import { useAuth } from "../../context/AuthContext";
import { getCustomer, updateProfile } from "../../services/api";
import { STATES, getDistricts, getCities } from "../../data/indiaLocations";

const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];
const OCCUPATIONS = [
  "Salaried (Government)", "Salaried (Private)", "Self-Employed",
  "Business Owner", "Freelancer", "Student", "Retired", "Homemaker", "Other",
];

function Field({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-lg bg-white/[0.04] border border-border flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-muted" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted">{label}</p>
        <p className="text-sm font-medium truncate">{value || <span className="text-muted/40 italic">Not set</span>}</p>
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder = "Select…" }) {
  return (
    <div>
      <label className="text-xs text-muted mb-1 block">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-border bg-white/[0.03] px-3.5 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
        >
          <option value="">{placeholder}</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
      </div>
    </div>
  );
}

function InputField({ label, type = "text", value, onChange, placeholder, maxLength, readOnly, suffix }) {
  return (
    <div>
      <label className="text-xs text-muted mb-1 block">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          readOnly={readOnly}
          className={`w-full rounded-xl border border-border bg-white/[0.03] px-3.5 py-2.5 text-sm outline-none transition-all ${
            readOnly
              ? "opacity-60 cursor-not-allowed"
              : "focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          }`}
        />
        {suffix && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted">{suffix}</span>
        )}
      </div>
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const customerId = user?.customer_id;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  // Editable form state
  const [form, setForm] = useState({
    name: "", dob: "", gender: "", phone: "", email: "",
    occupation: "", monthly_income: "",
    employment_years: "",
    state: "", district: "", city: "", village: "",
    pan_number: "", aadhaar_last4: "",
  });

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    getCustomer(customerId)
      .then((data) => {
        setProfile(data);
        setForm({
          name:             data.name            ?? "",
          dob:              data.dob             ?? "",
          gender:           data.gender          ?? "",
          phone:            data.phone           ?? "",
          email:            data.email           ?? "",
          occupation:       data.occupation      ?? "",
          monthly_income:   data.monthly_income  ?? "",
          employment_years: data.employment_years ?? "",
          state:            data.state           ?? "",
          district:         data.district        ?? "",
          city:             data.city            ?? "",
          village:          data.village         ?? "",
          pan_number:       data.pan_number      ?? "",
          aadhaar_last4:    data.aadhaar_last4   ?? "",
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [customerId]);

  // Cascading location resets
  const setStateVal = (v) => setForm((f) => ({ ...f, state: v, district: "", city: "" }));
  const setDistrictVal = (v) => setForm((f) => ({ ...f, district: v, city: "" }));

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const payload = { ...form };
      if (payload.monthly_income)   payload.monthly_income   = Number(payload.monthly_income);
      if (payload.employment_years) payload.employment_years = Number(payload.employment_years);
      // remove empty strings — send only set fields
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "") delete payload[k];
      });
      const updated = await updateProfile(customerId, payload);
      setProfile(updated);
      setEditing(false);
      setMsg({ ok: true, text: "Profile updated successfully!" });
    } catch (err) {
      setMsg({ ok: false, text: err?.response?.data?.detail || "Update failed." });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    if (profile) {
      setForm({
        name:             profile.name            ?? "",
        dob:              profile.dob             ?? "",
        gender:           profile.gender          ?? "",
        phone:            profile.phone           ?? "",
        email:            profile.email           ?? "",
        occupation:       profile.occupation      ?? "",
        monthly_income:   profile.monthly_income  ?? "",
        employment_years: profile.employment_years ?? "",
        state:            profile.state           ?? "",
        district:         profile.district        ?? "",
        city:             profile.city            ?? "",
        village:          profile.village         ?? "",
        pan_number:       profile.pan_number      ?? "",
        aadhaar_last4:    profile.aadhaar_last4   ?? "",
      });
    }
  };

  // derive age from dob for display
  function ageFromDob(dob) {
    if (!dob) return null;
    try {
      const d = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - d.getFullYear();
      if (
        today.getMonth() < d.getMonth() ||
        (today.getMonth() === d.getMonth() && today.getDate() < d.getDate())
      ) age--;
      return age;
    } catch { return null; }
  }

  const districts = getDistricts(form.state);
  const cities    = getCities(form.state, form.district);

  if (loading) return <AnimatedPage><PageHeader eyebrow="Account" title="My Profile" /><Loading label="Loading profile…" /></AnimatedPage>;

  return (
    <AnimatedPage>
      <PageHeader
        eyebrow="Account"
        title="My Profile"
        description="Manage your personal information and location details."
      />

      <AnimatePresence>
        {msg && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`flex items-center gap-2 text-sm rounded-xl px-4 py-3 mb-4 border ${
              msg.ok
                ? "text-success bg-success/10 border-success/20"
                : "text-danger bg-danger/10 border-danger/20"
            }`}
          >
            {msg.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            {msg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── VIEW MODE ── */}
      {!editing && profile && (
        <div className="space-y-4">
          {/* Avatar + basic */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
                  {profile.name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div>
                  <p className="text-lg font-semibold">{profile.name}</p>
                  <p className="text-xs text-muted">{profile.email ?? user?.email}</p>
                  {profile.dob && (
                    <p className="text-xs text-accent mt-0.5">
                      Age {ageFromDob(profile.dob)} · DOB {profile.dob}
                    </p>
                  )}
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { setEditing(true); setMsg(null); }}
                className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-xl border border-primary/30 text-accent hover:bg-primary/10 transition-all"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit Profile
              </motion.button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Gender"       value={profile.gender}    icon={User} />
              <Field label="Phone"        value={profile.phone}     icon={Phone} />
              <Field label="Email"        value={profile.email}     icon={Mail} />
              <Field label="Occupation"   value={profile.occupation} icon={Briefcase} />
              <Field label="Monthly Income" value={profile.monthly_income ? `₹${Number(profile.monthly_income).toLocaleString("en-IN")}` : null} icon={CreditCard} />
              <Field label="Employment"   value={profile.employment_years ? `${profile.employment_years} years` : null} icon={Calendar} />
            </div>
          </div>

          {/* Location */}
          <div className="glass rounded-2xl p-6">
            <p className="text-sm font-semibold mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-accent" /> Location
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="State"    value={profile.state}    icon={MapPin} />
              <Field label="District" value={profile.district} icon={MapPin} />
              <Field label="City"     value={profile.city}     icon={MapPin} />
              <Field label="Village"  value={profile.village}  icon={MapPin} />
            </div>
          </div>

          {/* Identity */}
          <div className="glass rounded-2xl p-6">
            <p className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-accent" /> Identity (stored securely)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="PAN Number"     value={profile.pan_number}    icon={CreditCard} />
              <Field label="Aadhaar (last 4)" value={profile.aadhaar_last4 ? `XXXX XXXX ${profile.aadhaar_last4}` : null} icon={Shield} />
            </div>
          </div>

          {/* Credit info (read-only) */}
          <div className="glass rounded-2xl p-4 flex items-center gap-4 border border-primary/20">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted">Credit Score</p>
              <p className="text-xl font-display font-bold">{profile.credit_score}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-muted">Risk Band</p>
              <p className="text-sm font-semibold">{profile.risk_band}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODE ── */}
      {editing && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Personal */}
          <div className="glass rounded-2xl p-6 space-y-4">
            <p className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-accent" /> Personal Information
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField label="Full Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Enter full name" />
              <InputField label="Date of Birth" type="date" value={form.dob} onChange={(v) => setForm((f) => ({ ...f, dob: v }))}
                suffix={form.dob ? `Age ${ageFromDob(form.dob)}` : undefined}
              />
              <SelectField label="Gender" value={form.gender} onChange={(v) => setForm((f) => ({ ...f, gender: v }))} options={GENDERS} />
              <InputField label="Phone Number" type="tel" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} placeholder="10-digit mobile number" maxLength={10} />
              <InputField label="Email Address" type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} placeholder="you@example.com" />
              <SelectField label="Occupation" value={form.occupation} onChange={(v) => setForm((f) => ({ ...f, occupation: v }))} options={OCCUPATIONS} />
              <InputField label="Monthly Income (₹)" type="number" value={form.monthly_income} onChange={(v) => setForm((f) => ({ ...f, monthly_income: v }))} placeholder="e.g. 50000" />
              <InputField label="Employment Years" type="number" value={form.employment_years} onChange={(v) => setForm((f) => ({ ...f, employment_years: v }))} placeholder="e.g. 3.5" />
            </div>
          </div>

          {/* Location */}
          <div className="glass rounded-2xl p-6 space-y-4">
            <p className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-accent" /> Location
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField
                label="State / UT"
                value={form.state}
                onChange={setStateVal}
                options={STATES}
                placeholder="Select state…"
              />
              <SelectField
                label="District"
                value={form.district}
                onChange={setDistrictVal}
                options={districts}
                placeholder={form.state ? "Select district…" : "Select state first"}
              />
              <SelectField
                label="City / Town"
                value={form.city}
                onChange={(v) => setForm((f) => ({ ...f, city: v }))}
                options={cities}
                placeholder={form.district ? "Select city…" : "Select district first"}
              />
              <InputField
                label="Village (if rural)"
                value={form.village}
                onChange={(v) => setForm((f) => ({ ...f, village: v }))}
                placeholder="Enter village name"
                maxLength={80}
              />
            </div>
          </div>

          {/* Identity */}
          <div className="glass rounded-2xl p-6 space-y-4">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-accent" /> Identity Documents
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="PAN Number"
                value={form.pan_number}
                onChange={(v) => setForm((f) => ({ ...f, pan_number: v.toUpperCase() }))}
                placeholder="ABCDE1234F"
                maxLength={10}
              />
              <InputField
                label="Aadhaar Last 4 Digits"
                type="number"
                value={form.aadhaar_last4}
                onChange={(v) => setForm((f) => ({ ...f, aadhaar_last4: v.slice(0, 4) }))}
                placeholder="e.g. 5678"
                maxLength={4}
              />
            </div>
            <p className="text-[10px] text-muted/60">
              Only the last 4 digits of Aadhaar are stored. PAN is used for loan applications only.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium shadow-[0_0_24px_-6px_rgba(37,99,235,0.5)] hover:bg-primary/90 transition-all disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save Changes"}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleCancel}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm text-muted hover:text-text hover:bg-white/5 transition-all disabled:opacity-60"
            >
              <X className="h-4 w-4" /> Cancel
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatedPage>
  );
}
