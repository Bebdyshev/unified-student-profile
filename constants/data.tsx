import { LucideIcon } from 'lucide-react';

export interface NavItem {
  title: string;
  url: string;
  icon?: keyof typeof Icons;
  isActive?: boolean;
  items?: NavSubItem[];
}

export interface NavSubItem {
  title: string;
  url: string;
}

export interface ClassInfo {
  id: number;
  class_liter: string;
  students_count?: number;
  curator?: string;
}

// Import using relative path instead of alias
import { Icons } from '../components/icons';

export const navItems: NavItem[] = [
  {
    title: 'Главная',
    url: '/dashboard/home',
    icon: 'dashboard',
    isActive: true
  },
  {
    title: 'Управление',
    url: '',
    icon: 'users',
    items: [
      {
        title: 'Все пользователи',
        url: '/dashboard/users/'
      },
      {
        title: 'Классы',
        url: '/dashboard/classes/'
      },
    ]
  },
  {
    title: 'Студенты',
    url: '/dashboard/students',
    icon: 'forms'
  },
  {
    title: 'Профиль',
    url: '/dashboard/profile',
    icon: 'user'
  },
  {
    title: 'Настройки',
    url: '/admin/settings',
    icon: 'settings'
  }
]; 

// Sample class data
export const classData: ClassInfo[] = [
  { id: 1, class_liter: '11A', students_count: 16, curator: 'Макарова И.Л.' },
  { id: 2, class_liter: '11B', students_count: 16, curator: 'Орлов С.В.' },
  { id: 3, class_liter: '11C', students_count: 16, curator: 'Козлова Т.М.' },
  { id: 4, class_liter: '11D', students_count: 16, curator: 'Никитин А.А.' },
  { id: 5, class_liter: '11E', students_count: 16, curator: 'Соловьева Е.С.' },
  { id: 6, class_liter: '11F', students_count: 16, curator: 'Лебедев П.К.' },
  { id: 7, class_liter: '11G', students_count: 16, curator: 'Комарова М.Р.' },
  { id: 8, class_liter: '11H', students_count: 16, curator: 'Титов Д.И.' }
];

// Sample subject data
export const subjectData = [
  {
    subjects: [
      'Математика',
      'Русский язык',
      'Литература',
      'Физика',
      'Химия',
      'Биология',
      'История',
      'География',
      'Английский язык',
      'Информатика'
    ]
  }
]; 