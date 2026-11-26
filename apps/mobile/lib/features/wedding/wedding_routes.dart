import 'package:go_router/go_router.dart';

import 'presentation/pages/wedding_entry_page.dart';
import 'presentation/pages/wedding_event_page.dart';
import 'presentation/pages/wedding_page.dart';

/// Wedding planner routes. Spread into the shell's route list in app.dart:
/// `...weddingRoutes,`
final weddingRoutes = <RouteBase>[
  GoRoute(
    path: '/wedding',
    builder: (_, __) => const WeddingEntryPage(),
    routes: [
      GoRoute(
        path: ':id',
        builder: (_, state) => WeddingPage(planId: state.pathParameters['id']!),
        routes: [
          GoRoute(
            path: 'event/:eventId',
            builder: (_, state) => WeddingEventPage(
              planId: state.pathParameters['id']!,
              eventId: state.pathParameters['eventId']!,
            ),
          ),
        ],
      ),
    ],
  ),
];
