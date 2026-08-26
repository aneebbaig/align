import 'package:flutter/material.dart';

extension LucideIconEmoji on String {
  /// Converts a Lucide icon name to an emoji for use in Android RemoteViews (widgets).
  String get toEmoji {
    switch (this) {
      case 'Utensils': case 'UtensilsCrossed': return '🍽';
      case 'Coffee': return '☕';
      case 'ShoppingCart': return '🛒';
      case 'ShoppingBag': return '🛍';
      case 'Home': case 'House': return '🏠';
      case 'Car': return '🚗';
      case 'Fuel': return '⛽';
      case 'Bus': return '🚌';
      case 'Plane': return '✈';
      case 'Train': return '🚂';
      case 'Heart': return '❤';
      case 'Activity': return '📈';
      case 'Pill': case 'Stethoscope': return '💊';
      case 'Hospital': return '🏥';
      case 'BookOpen': case 'Book': return '📚';
      case 'GraduationCap': return '🎓';
      case 'Briefcase': return '💼';
      case 'Laptop': return '💻';
      case 'Tv': return '📺';
      case 'Music': return '🎵';
      case 'Gamepad': return '🎮';
      case 'Film': return '🎬';
      case 'Headphones': return '🎧';
      case 'Sparkles': return '✨';
      case 'Shirt': return '👕';
      case 'Scissors': return '✂';
      case 'Gift': return '🎁';
      case 'Wrench': return '🔧';
      case 'Zap': return '⚡';
      case 'Droplets': case 'Droplet': return '💧';
      case 'Flame': return '🔥';
      case 'Shield': return '🛡';
      case 'Lock': return '🔒';
      case 'Phone': return '📱';
      case 'Wifi': return '📶';
      case 'Wallet': return '👛';
      case 'CreditCard': return '💳';
      case 'PiggyBank': return '🐷';
      case 'Receipt': return '🧾';
      case 'Dumbbell': return '🏋';
      case 'Trees': return '🌳';
      case 'Dog': return '🐕';
      case 'Cat': return '🐈';
      case 'Baby': return '👶';
      case 'Star': return '⭐';
      case 'MoreHorizontal': return '···';
      default: return '•';
    }
  }
}

extension LucideIconName on String {
  IconData get lucideIcon {
    switch (this) {
      // Finance
      case 'Wallet': return Icons.account_balance_wallet;
      case 'CreditCard': return Icons.credit_card;
      case 'DollarSign': return Icons.attach_money;
      case 'PiggyBank': return Icons.savings;
      case 'TrendingUp': return Icons.trending_up;
      case 'TrendingDown': return Icons.trending_down;
      case 'Receipt': return Icons.receipt;
      case 'Banknote': return Icons.payments;
      // Food & Home
      case 'Utensils': return Icons.restaurant;
      case 'UtensilsCrossed': return Icons.no_food;
      case 'Coffee': return Icons.local_cafe;
      case 'ShoppingCart': return Icons.shopping_cart;
      case 'ShoppingBag': return Icons.shopping_bag;
      case 'Home': return Icons.home;
      case 'House': return Icons.home;
      // Transport
      case 'Car': return Icons.directions_car;
      case 'Fuel': return Icons.local_gas_station;
      case 'Bus': return Icons.directions_bus;
      case 'Plane': return Icons.flight;
      case 'Train': return Icons.train;
      // Health
      case 'Heart': return Icons.favorite;
      case 'Activity': return Icons.monitor_heart;
      case 'Pill': return Icons.medication;
      case 'Stethoscope': return Icons.medical_services;
      case 'Hospital': return Icons.local_hospital;
      // Education & Work
      case 'BookOpen': return Icons.menu_book;
      case 'Book': return Icons.book;
      case 'GraduationCap': return Icons.school;
      case 'Briefcase': return Icons.work;
      case 'Laptop': return Icons.laptop;
      // Entertainment
      case 'Tv': return Icons.tv;
      case 'Music': return Icons.music_note;
      case 'Gamepad': return Icons.sports_esports;
      case 'Film': return Icons.movie;
      case 'Headphones': return Icons.headphones;
      // Personal
      case 'Sparkles': return Icons.auto_awesome;
      case 'Shirt': return Icons.checkroom;
      case 'Scissors': return Icons.content_cut;
      case 'Gift': return Icons.card_giftcard;
      // Utilities & Tools
      case 'Wrench': return Icons.build;
      case 'Zap': return Icons.bolt;
      case 'Droplets': return Icons.water_drop;
      case 'Droplet': return Icons.water_drop;
      case 'Flame': return Icons.local_fire_department;
      case 'Shield': return Icons.shield;
      case 'Lock': return Icons.lock;
      case 'Phone': return Icons.phone;
      case 'Wifi': return Icons.wifi;
      // Calendar & Navigation
      case 'CalendarDays': return Icons.calendar_today;
      case 'Calendar': return Icons.calendar_today;
      case 'ChevronDown': return Icons.keyboard_arrow_down;
      case 'ChevronRight': return Icons.keyboard_arrow_right;
      // Misc
      case 'MoreHorizontal': return Icons.more_horiz;
      case 'Star': return Icons.star;
      case 'Tag': return Icons.label;
      case 'Package': return Icons.inventory_2;
      case 'Box': return Icons.inbox;
      case 'Building': return Icons.business;
      case 'Building2': return Icons.apartment;
      case 'Baby': return Icons.child_care;
      case 'Dog': return Icons.pets;
      case 'Cat': return Icons.pets;
      case 'Trees': return Icons.park;
      case 'Dumbbell': return Icons.fitness_center;
      default: return Icons.label;
    }
  }
}
