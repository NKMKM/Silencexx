import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

typedef Json = Map<String, dynamic>;

class ApiException implements Exception {
  final String message;
  final int status;
  final Json data;
  const ApiException(this.message, {this.status = 0, this.data = const {}});
  @override
  String toString() => message;
}

class Api {
  Api({http.Client? client, String? baseUrl})
    : client = client ?? http.Client(),
      baseUrl = (baseUrl ?? defaultUrl).replaceAll(RegExp(r'/+$'), '');

  static String get defaultUrl {
    const configured = String.fromEnvironment('API_BASE_URL');
    if (configured.isNotEmpty) return configured;
    return !kIsWeb && defaultTargetPlatform == TargetPlatform.android
        ? 'http://10.0.2.2:3000/api'
        : 'http://localhost:3000/api';
  }

  final http.Client client;
  final String baseUrl;
  String? token;
  VoidCallback? onUnauthorized;
  static const timeout = Duration(seconds: 200);

  Future<Json> call(String path, {String method = 'GET', Json? body}) async {
    final request = http.Request(method, Uri.parse('$baseUrl$path'));
    request.headers.addAll({
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      if (token != null) 'Authorization': 'Bearer $token',
    });
    if (body != null) request.body = jsonEncode(body);
    return _send(request);
  }

  Future<Json> upload(
    String path, {
    required String field,
    required List<int> bytes,
    required String filename,
    required String mime,
    Map<String, String> fields = const {},
  }) {
    final request = http.MultipartRequest('POST', Uri.parse('$baseUrl$path'));
    request.headers.addAll({
      if (token != null) 'Authorization': 'Bearer $token',
      'ngrok-skip-browser-warning': 'true',
    });
    request.fields.addAll(fields);
    request.files.add(
      http.MultipartFile.fromBytes(
        field,
        bytes,
        filename: filename,
        contentType: MediaType.parse(mime),
      ),
    );
    return _send(request);
  }

  Future<Json> _send(http.BaseRequest request) async {
    try {
      final response = await (() async {
        return http.Response.fromStream(await client.send(request));
      })().timeout(timeout);
      if (response.statusCode == 401 && token != null) onUnauthorized?.call();
      Json data;
      try {
        data = Map<String, dynamic>.from(jsonDecode(response.body) as Map);
      } catch (_) {
        throw ApiException(
          'Invalid server response (${response.statusCode})',
          status: response.statusCode,
        );
      }
      if (response.statusCode < 200 ||
          response.statusCode >= 300 ||
          data['success'] == false) {
        throw ApiException(
          '${data['error'] ?? data['message'] ?? 'Request failed'}',
          status: response.statusCode,
          data: data,
        );
      }
      return data;
    } on TimeoutException {
      throw const ApiException('Server response timed out. Please try again.');
    } on http.ClientException {
      throw const ApiException(
        'Cannot connect to server. Check your connection and API address.',
      );
    }
  }

  String mediaUrl(String path) {
    final uri = Uri.parse(path.replaceAll('\\', '/'));
    if (uri.scheme == 'http' || uri.scheme == 'https') return uri.toString();
    final normalized = uri.path;
    final index = normalized.indexOf('uploads/');
    final relative = index >= 0
        ? normalized.substring(index)
        : normalized.replaceFirst(RegExp(r'^/'), '');
    return Uri.parse(baseUrl).resolve('/$relative').toString();
  }

  void close() => client.close();
}

List<Json> rows(Json data, String key) => (data[key] as List? ?? [])
    .map((e) => Map<String, dynamic>.from(e as Map))
    .toList();
