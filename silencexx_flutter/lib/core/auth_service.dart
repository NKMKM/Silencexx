import 'dart:convert';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'api.dart';
import 'app_state.dart';

/// Provider integrations return the same backend session shape to the UI.
class AuthService {
  AuthService(this.app);
  final AppState app;

  Future<void> registerWithEmail({
    required String email,
    required String nickname,
    required String password,
  }) async {
    final response = await app.api.call(
      '/auth/register',
      method: 'POST',
      body: {
        'method': 'email',
        'contact': email.trim().toLowerCase(),
        'name': nickname.trim(),
        'password': password,
      },
    );
    response['isNewUser'] = true;
    await app.acceptAuth(response);
  }

  Future<void> signInWithEmail({
    required String email,
    required String password,
  }) async {
    final response = await app.api.call(
      '/auth/login',
      method: 'POST',
      body: {
        'method': 'email',
        'contact': email.trim().toLowerCase(),
        'password': password,
      },
    );
    await app.acceptAuth(response);
  }

  Future<void> signInWithGoogle() async {
    if (kIsWeb) {
      throw const ApiException('Google sign-in is not configured for web.');
    }
    const clientId = String.fromEnvironment('GOOGLE_CLIENT_ID');
    const serverClientId = String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID');
    if (clientId.isEmpty || serverClientId.isEmpty) {
      throw const ApiException(
        'Google sign-in needs GOOGLE_CLIENT_ID and GOOGLE_SERVER_CLIENT_ID at build time.',
      );
    }
    final account = await GoogleSignIn(
      clientId: clientId,
      serverClientId: serverClientId,
      scopes: const ['email', 'profile'],
    ).signIn();
    if (account == null) return;
    final token = (await account.authentication).idToken;
    if (token == null) {
      throw const ApiException(
        'Google did not return an ID token. Check the OAuth client configuration.',
      );
    }
    final response = await app.api.call(
      '/auth/oauth/google',
      method: 'POST',
      body: {'idToken': token},
    );
    await app.acceptAuth(response);
  }

  Future<void> signInWithApple() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.iOS) {
      throw const ApiException('Apple sign-in is available in the iOS app.');
    }
    final random = Random.secure();
    final nonce = base64UrlEncode(
      List<int>.generate(32, (_) => random.nextInt(256)),
    ).replaceAll('=', '');
    final credential = await SignInWithApple.getAppleIDCredential(
      nonce: nonce,
      scopes: [
        AppleIDAuthorizationScopes.email,
        AppleIDAuthorizationScopes.fullName,
      ],
    );
    final token = credential.identityToken;
    if (token == null) {
      throw const ApiException('Apple did not return an identity token.');
    }
    final response = await app.api.call(
      '/auth/oauth/apple',
      method: 'POST',
      body: {
        'identityToken': token,
        'nonce': nonce,
        'displayName':
            '${credential.givenName ?? ''} ${credential.familyName ?? ''}'
                .trim(),
      },
    );
    await app.acceptAuth(response);
  }
}
