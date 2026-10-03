import 'package:flutter/material.dart';

abstract final class AppShadows {
  static const card = <BoxShadow>[
    BoxShadow(color: Color(0x0A000000), blurRadius: 20, offset: Offset(0, 8)),
  ];

  static const accent = <BoxShadow>[
    BoxShadow(color: Color(0x267186F8), blurRadius: 22, offset: Offset(0, 8)),
  ];

  static const ambient = <BoxShadow>[
    BoxShadow(color: Color(0x149B8CFF), blurRadius: 28, offset: Offset(0, 12)),
  ];
}
