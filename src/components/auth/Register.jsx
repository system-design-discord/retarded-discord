import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from "../../services/api";

export default function Register() {
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        password_confirm: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.password_confirm) {
            setError('رمز عبور و تکرار آن مطابقت ندارند.');
            return;
        }

        setLoading(true);
        try {
            await api.post('auth/register/', formData);
            navigate('/login'); // بعد از ثبت‌نام موفق، به صفحه لاگین هدایت شود
        } catch (err) {
            const errorMsg = err.response?.data?.username?.[0] || 
                             err.response?.data?.email?.[0] || 
                             'خطایی در ثبت‌نام رخ داد. لطفا دوباره تلاش کنید.';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
            <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6 text-center text-blue-500">ساخت حساب جدید</h2>
                
                {error && <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded mb-4 text-sm text-center">{error}</div>}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">نام کاربری</label>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">ایمیل</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">رمز عبور</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">تکرار رمز عبور</label>
                        <input
                            type="password"
                            name="password_confirm"
                            value={formData.password_confirm}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>
                    
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold transition-colors disabled:opacity-50"
                    >
                        {loading ? 'در حال ثبت‌نام...' : 'ثبت‌نام'}
                    </button>
                </form>

                <p className="mt-4 text-center text-sm text-gray-400">
                    از قبل حساب دارید؟ <Link to="/login" className="text-blue-400 hover:underline">وارد شوید</Link>
                </p>
            </div>
        </div>
    );
}