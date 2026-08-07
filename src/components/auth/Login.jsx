import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      // انتقال مستقیم به داشبورد اصلی
      navigate('/dashboard');
    } catch (err) {
      setError('نام کاربری یا رمز عبور اشتباه است.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h2 className="text-3xl font-extrabold text-white text-center mb-2">ورود به حساب کاربری</h2>
        <p className="text-slate-400 text-sm text-center mb-6">خوش آمدید! خوشحالیم دوباره شما را می‌بینیم.</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-lg text-sm text-center mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-slate-300 text-xs font-bold uppercase mb-2">نام کاربری</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition duration-200"
              placeholder="نام کاربری خود را وارد کنید"
            />
          </div>

          <div>
            <label className="block text-slate-300 text-xs font-bold uppercase mb-2">رمز عبور</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition duration-200"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg hover:shadow-indigo-500/30 transition duration-200 cursor-pointer"
          >
            ورود
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          حساب کاربری ندارید؟{' '}
          <Link to="/register" className="text-indigo-400 hover:underline font-semibold">
            ثبت‌نام کنید
          </Link>
        </div>
      </div>
    </div>
  );
}