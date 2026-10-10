import React, { useState } from 'react';
import { z } from 'zod';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/lib/authContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

// Zod validation schema
const loginSchema = z.object({
  email: z
    .string()
    .min(1, "L'adresse email est requise")
    .email('Veuillez entrer une adresse email valide'),
  password: z
    .string()
    .min(4, 'Le mot de passe doit comporter au moins 4 caractères'),
  rememberMe: z.boolean().default(false),
});

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState(false);

  // tRPC email/pwd mutation
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      setLoginSuccess(true);
      setServerError('');
      setTimeout(() => {
        login(data.user, data.token, rememberMe);
      }, 400);
    },
    onError: (error) => {
      setServerError(error.message || 'Échec de la connexion. Vérifiez vos identifiants.');
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setForgotPasswordMessage(false);

    // Zod validation
    const validationResult = loginSchema.safeParse({ email, password, rememberMe });
    if (!validationResult.success) {
      const formattedErrors = {};
      validationResult.error.errors.forEach((err) => {
        if (err.path[0]) {
          formattedErrors[err.path[0]] = err.message;
        }
      });
      setFormErrors(formattedErrors);
      return;
    }

    setFormErrors({});

    loginMutation.mutate({
      email,
      password,
      rememberMe,
    });
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-[#fafafa] bg-grid-pattern relative overflow-hidden">
      {/* Discreet, barely-visible soft ambient depth */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-50/50 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-slate-100/60 blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative w-full max-w-[400px] z-10 animate-in fade-in-50 zoom-in-95 duration-500">
        {/* Main shadcn Card */}
        <Card className="border border-zinc-200 bg-white/98 backdrop-blur-sm shadow-md shadow-zinc-950/5 rounded-xl overflow-hidden relative">
          {/* Subtle Hairline Accent */}
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#1D7CEA]/40 to-transparent" />

          <CardHeader className="space-y-1 text-center pb-5 pt-6">
            {/* Centered Brand Logo */}
            <div className="flex justify-center mb-3">
              <img
                src="/predictix-logo.png"
                alt="Predictix Logo"
                className="w-12 h-12 object-contain rounded-xl shadow-xs"
              />
            </div>

            <CardTitle className="text-xl font-bold tracking-tight text-zinc-900">
              Connexion à Predictix
            </CardTitle>
            <CardDescription className="text-xs text-zinc-500">
              Entrez vos identifiants pour accéder à votre espace
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-0 pb-6 px-6">
            {/* Server Error Alert */}
            {serverError && (
              <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 flex items-start gap-2.5 text-xs animate-in fade-in-50">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <div className="flex-1">
                  <strong className="font-semibold block">Erreur d'accès</strong>
                  <span>{serverError}</span>
                </div>
              </div>
            )}

            {/* Forgot Password info message */}
            {forgotPasswordMessage && (
              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-900 flex items-start gap-2 text-xs animate-in fade-in-50">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-[#1D7CEA]" />
                <div>
                  <strong className="font-semibold block">Réinitialisation sécurisée</strong>
                  <span>Pour réinitialiser votre mot de passe, modifiez la variable <code className="bg-blue-100/80 px-1 py-0.5 rounded text-[11px]">ADMIN_PASSWORD</code> sur votre serveur.</span>
                </div>
              </div>
            )}

            {/* Success Alert */}
            {loginSuccess && (
              <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center gap-2 text-xs animate-in fade-in-50">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="font-medium">Connexion réussie ! Chargement en cours...</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Email Field with Icon inside */}
              <div className="space-y-1">
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 w-4 h-4 text-zinc-400 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Adresse email"
                    className={`pl-10 ${formErrors.email ? 'border-rose-400 focus-visible:ring-rose-500' : ''}`}
                    disabled={loginMutation.isLoading || loginSuccess}
                    autoComplete="email"
                  />
                </div>
                {formErrors.email && (
                  <span className="text-[11px] text-rose-600 font-normal block pl-1">
                    {formErrors.email}
                  </span>
                )}
              </div>

              {/* Password Field with Icon inside */}
              <div className="space-y-1">
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-zinc-400 pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mot de passe"
                    className={`pl-10 pr-10 ${formErrors.password ? 'border-rose-400 focus-visible:ring-rose-500' : ''}`}
                    disabled={loginMutation.isLoading || loginSuccess}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors focus:outline-none"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formErrors.password && (
                  <span className="text-[11px] text-rose-600 font-normal block pl-1">
                    {formErrors.password}
                  </span>
                )}
              </div>

              {/* Remember Me Checkbox & Forgot Password */}
              <div className="flex items-center justify-between pt-0.5">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(!!checked)}
                    disabled={loginMutation.isLoading || loginSuccess}
                  />
                  <label
                    htmlFor="rememberMe"
                    className="text-xs font-medium text-zinc-600 cursor-pointer select-none hover:text-zinc-900"
                  >
                    Se souvenir de moi
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => setForgotPasswordMessage(!forgotPasswordMessage)}
                  className="text-xs text-zinc-500 hover:text-zinc-900 underline-offset-4 hover:underline transition-colors"
                >
                  Mot de passe oublié ?
                </button>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                size="default"
                className="w-full mt-3 font-medium bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm transition-all hover:shadow active:scale-[0.99]"
                disabled={loginMutation.isLoading || loginSuccess}
              >
                {loginMutation.isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connexion en cours...
                  </>
                ) : loginSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2 text-white" />
                    Connecté
                  </>
                ) : (
                  'Se connecter'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
