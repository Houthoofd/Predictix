import React, { useState } from 'react';
import { z } from 'zod';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/lib/authContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

// Google Icon Component
function GoogleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 mr-2.5 shrink-0" {...props}>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

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

  // Google Modal State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('utilisateur.google@gmail.com');
  const [googleNameInput, setGoogleNameInput] = useState('Utilisateur Google');

  // tRPC email/pwd mutation
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      setLoginSuccess(true);
      setServerError('');
      setTimeout(() => {
        login(data.user, data.token, rememberMe);
      }, 500);
    },
    onError: (error) => {
      setServerError(error.message || 'Échec de la connexion. Vérifiez vos identifiants.');
    },
  });

  // tRPC Google mutation
  const googleMutation = trpc.auth.loginWithGoogle.useMutation({
    onSuccess: (data) => {
      setLoginSuccess(true);
      setServerError('');
      setShowGoogleModal(false);
      setTimeout(() => {
        login(data.user, data.token, true);
      }, 500);
    },
    onError: (error) => {
      setServerError(error.message || 'Échec de la connexion via Google.');
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

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

  const handleConfirmGoogleAuth = () => {
    if (!googleEmailInput || !googleEmailInput.includes('@')) {
      alert('Veuillez spécifier une adresse email Google valide.');
      return;
    }
    googleMutation.mutate({
      email: googleEmailInput,
      name: googleNameInput || googleEmailInput.split('@')[0],
    });
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-[#fafafa] bg-grid-pattern relative overflow-hidden">
      {/* Subtle Ambient Blurred Gradient Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-100/40 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-violet-100/35 blur-3xl pointer-events-none animate-pulse [animation-delay:2s]" />

      {/* Main Container */}
      <div className="relative w-full max-w-[400px] z-10 animate-in fade-in-50 zoom-in-95 duration-500">
        {/* Main shadcn Card */}
        <Card className="border border-zinc-200 bg-white/95 backdrop-blur-sm shadow-md shadow-zinc-950/5 rounded-xl overflow-hidden relative">
          {/* Subtle Accent Hairline on top edge */}
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-zinc-900/40 to-transparent" />

          <CardHeader className="space-y-1 text-center pb-5 pt-6">
            {/* Centered Brand Logo with smooth hover/scale */}
            <div className="flex justify-center mb-3">
              <div className="h-10 w-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs transition-transform hover:scale-105 duration-200">
                <TrendingUp className="w-5 h-5 text-white stroke-[2.5]" />
              </div>
            </div>

            <CardTitle className="text-2xl font-bold tracking-tight text-zinc-900">
              Predictix
            </CardTitle>
            <CardDescription className="text-sm text-zinc-500">
              Entrez vos identifiants pour vous connecter
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Server Error Alert */}
            {serverError && (
              <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 flex items-start gap-2.5 text-xs animate-in fade-in-50">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <div className="flex-1">
                  <strong className="font-semibold block">Erreur de connexion</strong>
                  <span>{serverError}</span>
                </div>
              </div>
            )}

            {/* Success Alert */}
            {loginSuccess && (
              <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center gap-2 text-xs animate-in fade-in-50">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Connexion réussie ! Chargement en cours...</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
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
                    disabled={loginMutation.isLoading || googleMutation.isLoading || loginSuccess}
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
                    disabled={loginMutation.isLoading || googleMutation.isLoading || loginSuccess}
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
                    disabled={loginMutation.isLoading || googleMutation.isLoading || loginSuccess}
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
                  onClick={() => {
                    alert('Pour réinitialiser le mot de passe, contactez l’administrateur.');
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-900 underline-offset-4 hover:underline transition-colors"
                >
                  Mot de passe oublié ?
                </button>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                size="default"
                className="w-full mt-2 font-medium bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm transition-all hover:shadow active:scale-[0.99]"
                disabled={loginMutation.isLoading || googleMutation.isLoading || loginSuccess}
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

            {/* Separator / Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-zinc-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2.5 text-zinc-400 font-medium">
                  ou
                </span>
              </div>
            </div>

            {/* Google Authentication Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-10 border-zinc-200 hover:bg-zinc-50 text-zinc-800 font-medium shadow-xs transition-colors"
              onClick={() => setShowGoogleModal(true)}
              disabled={loginMutation.isLoading || googleMutation.isLoading || loginSuccess}
            >
              {googleMutation.isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin text-zinc-600" />
                  Connexion Google...
                </>
              ) : (
                <>
                  <GoogleIcon />
                  Continuer avec Google
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Google Sign-in Modal */}
      <Dialog open={showGoogleModal} onOpenChange={setShowGoogleModal}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader className="space-y-2">
            <div className="flex items-center justify-center mb-1">
              <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center">
                <GoogleIcon className="mr-0 w-5 h-5" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">Connexion avec Google</DialogTitle>
            <DialogDescription className="text-center text-xs text-zinc-500">
              Choisissez ou saisissez le compte Google avec lequel vous connecter à Predictix.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Quick Select Preset Google Account */}
            <div
              onClick={() => {
                setGoogleEmailInput('benoit.predictix@gmail.com');
                setGoogleNameInput('Benoît');
              }}
              className="p-3 rounded-lg border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/70 transition-all cursor-pointer flex items-center gap-3"
            >
              <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center">
                B
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-zinc-900 block truncate">Benoît (Compte Google)</span>
                <span className="text-[11px] text-zinc-500 font-mono block truncate">benoit.predictix@gmail.com</span>
              </div>
              <span className="text-[11px] text-blue-600 font-medium">Sélectionner</span>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-zinc-100" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-white px-2 text-zinc-400 font-medium">ou autre compte Google</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="googleEmail" className="text-xs text-zinc-700">Adresse Google (Gmail)</Label>
              <Input
                id="googleEmail"
                type="email"
                value={googleEmailInput}
                onChange={(e) => setGoogleEmailInput(e.target.value)}
                placeholder="votre.nom@gmail.com"
                disabled={googleMutation.isLoading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="googleName" className="text-xs text-zinc-700">Nom affiché</Label>
              <Input
                id="googleName"
                type="text"
                value={googleNameInput}
                onChange={(e) => setGoogleNameInput(e.target.value)}
                placeholder="Votre Nom"
                disabled={googleMutation.isLoading}
              />
            </div>

            <Button
              type="button"
              className="w-full bg-zinc-900 text-white hover:bg-zinc-800"
              onClick={handleConfirmGoogleAuth}
              disabled={googleMutation.isLoading}
            >
              {googleMutation.isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Authentification Google...
                </>
              ) : (
                'Confirmer la connexion Google'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
