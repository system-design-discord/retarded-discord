import { useState, useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import PasswordField from './PasswordField';

// #128 — the field takes an **email address or a username**, which is what the
// login wireframe labels it and what `auth/login/` accepts since that card.
// Registration has always required an email, so the screen used to make a user
// type an address and then refuse it as a credential, with the same message a
// wrong password gets. The state is named `identifier` rather than `username`
// because it is no longer either one in particular; the request body still says
// `username`, which is the key simplejwt reads.
export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Look for the intended destination in state, otherwise default to dashboard
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(identifier, password);
      // Navigate to the target route and replace the login page in browser history
      navigate(from, { replace: true });
    } catch (err) {
      // Deliberately does not say which of the three was wrong: naming the
      // field would turn the form into an account-existence oracle. Matches
      // `common.messages.INVALID_CREDENTIALS` on the server.
      setError('Invalid email, username, or password.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h2 className="text-3xl font-extrabold text-white text-center mb-2">Welcome Back!</h2>
        <p className="text-slate-400 text-sm text-center mb-6">We're so excited to see you again!</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-3 rounded-xl text-xs text-center font-semibold mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="identifier" className="block text-slate-400 text-xs font-bold uppercase mb-2">
              Email or Username
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition duration-200 text-sm"
              placeholder="example@email.com"
            />
          </div>

          <PasswordField
            label="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition duration-200 cursor-pointer"
          >
            Log In
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          Need an account?{' '}
          <Link to="/register" className="text-indigo-400 hover:underline font-semibold">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}