/**
 * Admin dashboard and CRUD: stats, users, diet plans, login activity, analytics.
 */

import {
  countUsers,
  findAllUsers,
  findUserById,
  deleteUserById,
  getDailyRegistrationCounts,
} from '../repositories/userRepository.js';
import {
  countDietPlans,
  findDietPlansFiltered,
  getDailyDietPlanCounts,
} from '../repositories/dietPlanRepository.js';
import {
  countLoginLogs,
  findLoginLogs,
  countActiveUsersToday,
  getDailyLoginCounts,
} from '../repositories/loginLogRepository.js';

export async function getDashboardStats(req, res) {
  try {
    const [totalUsers, totalPlans, totalLogins, activeToday] = await Promise.all([
      countUsers(),
      countDietPlans(),
      countLoginLogs(),
      countActiveUsersToday(),
    ]);
    return res.status(200).json({
      success: true,
      data: {
        total_users: totalUsers,
        total_diet_plans: totalPlans,
        total_user_logins: totalLogins,
        active_users_today: activeToday,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err?.message ?? 'Failed to load stats.' },
    });
  }
}

export async function getUsers(req, res) {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const skip = Number(req.query.skip) || 0;
    const users = await findAllUsers(limit, skip);
    const formatted = users.map((u) => ({
      id: u._id?.toString(),
      name: u.name ?? '',
      email: u.email ?? '',
      age: u.age ?? null,
      goal: u.goal ?? '',
      diet_preference: u.diet_preference ?? '',
      registration_date: u.created_at ? new Date(u.created_at).toISOString() : null,
    }));
    return res.status(200).json({ success: true, data: formatted });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err?.message ?? 'Failed to load users.' },
    });
  }
}

export async function getUserById(req, res) {
  try {
    const id = req.params.id;
    const user = await findUserById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found.' },
      });
    }
    return res.status(200).json({
      success: true,
      data: {
        id: user._id?.toString(),
        name: user.name ?? '',
        email: user.email ?? '',
        age: user.age ?? null,
        gender: user.gender ?? '',
        height: user.height ?? null,
        weight: user.weight ?? null,
        goal: user.goal ?? '',
        diet_preference: user.diet_preference ?? '',
        registration_date: user.created_at ? new Date(user.created_at).toISOString() : null,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err?.message ?? 'Failed to load user.' },
    });
  }
}

export async function deleteUser(req, res) {
  try {
    const id = req.params.id;
    const deleted = await deleteUserById(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found.' },
      });
    }
    return res.status(200).json({ success: true, message: 'User deleted.' });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err?.message ?? 'Failed to delete user.' },
    });
  }
}

export async function getDietPlans(req, res) {
  try {
    const period = String(req.query.period ?? 'all').toLowerCase();
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const skip = Number(req.query.skip) || 0;
    const validPeriod = ['all', 'today', 'week', 'month'].includes(period) ? period : 'all';
    const plans = await findDietPlansFiltered({ period: validPeriod, limit, skip });
    const formatted = plans.map((p) => ({
      id: p._id?.toString(),
      user_id: p.user_id?.toString(),
      user_email: p.user?.email ?? p.user?.name ?? p.user_id?.toString() ?? '—',
      goal: p.user?.goal ?? '',
      calories: p.calories ?? '',
      creation_date: p.created_at ? new Date(p.created_at).toISOString() : null,
    }));
    return res.status(200).json({ success: true, data: formatted });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err?.message ?? 'Failed to load diet plans.' },
    });
  }
}

export async function getLoginActivity(req, res) {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const skip = Number(req.query.skip) || 0;
    const logs = await findLoginLogs(limit, skip);
    const formatted = logs.map((l) => ({
      id: l._id?.toString(),
      user_id: l.user_id?.toString(),
      email: l.email ?? '—',
      login_time: l.login_time ? new Date(l.login_time).toISOString() : null,
      ip_address: l.ip_address ?? '—',
      device_info: l.device_info ?? '—',
    }));
    return res.status(200).json({ success: true, data: formatted });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err?.message ?? 'Failed to load login activity.' },
    });
  }
}

export async function getAnalytics(req, res) {
  try {
    const days = Math.min(Number(req.query.days) || 30, 90);
    const [dailyRegistrations, dailyLogins, dailyPlans] = await Promise.all([
      getDailyRegistrationCounts(days),
      getDailyLoginCounts(days),
      getDailyDietPlanCounts(days),
    ]);
    return res.status(200).json({
      success: true,
      data: {
        daily_registrations: dailyRegistrations,
        daily_logins: dailyLogins,
        daily_diet_plans: dailyPlans,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err?.message ?? 'Failed to load analytics.' },
    });
  }
}
