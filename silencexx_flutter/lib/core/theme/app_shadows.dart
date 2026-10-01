import 'package:flutter/material.dart';

abstract final class AppShadows {
  static const card = <BoxShadow>[
    BoxShadow(color: Color(0x0A000000), blurRadius: 20, offset: Offset(0, 8)),
  ];

  static const accent = <BoxShadow>[
    BoxShadow(color: Color(0x20FF3D91), blurRadius: 22, offset: Offset(0, 8)),
  ];

  static const ambient = <BoxShadow>[
    BoxShadow(color: Color(0x119B64BA), blurRadius: 28, offset: Offset(0, 12)),
  ];
}
