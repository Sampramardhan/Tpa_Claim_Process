package com.tpa.security;

import com.tpa.auth.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class TpaUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public TpaUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return userRepository.findByEmailIgnoreCase(username)
                .map(TpaUserPrincipal::fromUser)
                .orElseThrow(() -> new UsernameNotFoundException("User was not found."));
    }
}
