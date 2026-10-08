import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
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
    return 'https://frying-liver-gotten.ngrok-free.dev/api';
  }

  final http.Client client;
  final String baseUrl;
  String? token;
  VoidCallback? onUnauthorized;
  static const timeout = Duration(seconds: 180);

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
      if (response.statusCode == 401 &&
          token != null &&
          request.headers['Authorization'] == 'Bearer $token') {
        onUnauthorized?.call();
      }
      if (response.body.contains('ERR_NGROK_3200')) {
        throw ApiException(
          'Сервер временно недоступен. Повторите попытку позже. / Server is offline. Please try again later.',
          status: response.statusCode,
        );
      }
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

  Future<Uint8List> downloadMedia(String path) async {
    final uri = Uri.parse(mediaUrl(path));
    if (uri.origin != Uri.parse(baseUrl).origin) {
      throw const ApiException('Media must belong to this server');
    }
    final requestToken = token;
    try {
      final response = await client
          .get(
            uri,
            headers: {
              if (requestToken != null) 'Authorization': 'Bearer $requestToken',
              'ngrok-skip-browser-warning': 'true',
            },
          )
          .timeout(timeout);
      if (response.statusCode == 401 &&
          token == requestToken &&
          token != null) {
        onUnauthorized?.call();
      }
      if (response.statusCode != 200 ||
          response.bodyBytes.length > 10 * 1024 * 1024) {
        throw ApiException('Could not load audio', status: response.statusCode);
      }
      return response.bodyBytes;
    } on TimeoutException {
      throw const ApiException('Audio download timed out');
    } on http.ClientException {
      throw const ApiException('Could not connect to audio server');
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
