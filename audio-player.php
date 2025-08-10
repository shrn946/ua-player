<?php
/**
 * Plugin Name: UA Player
 * Description: Audio slider + playlist. Settings page under "UA Player" (admin). Shortcode: [ua_player]
 * Version: 1.6
 * Author: Hassan
 * Text Domain: ua-player
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class UA_Player_Plugin {
    private $option_name = 'ua_player_playlist';
    private $plugin_url;
    private $plugin_dir;

    public function __construct() {
        $this->plugin_url = plugin_dir_url( __FILE__ );
        $this->plugin_dir = plugin_dir_path( __FILE__ );

        add_action( 'admin_menu', [ $this, 'add_admin_menu' ] );
        add_action( 'admin_init', [ $this, 'maybe_handle_save' ] );
        add_action( 'admin_enqueue_scripts', [ $this, 'admin_enqueue' ] );
        add_action( 'wp_enqueue_scripts', [ $this, 'frontend_enqueue' ] );
        add_action( 'wp_head', [ $this, 'output_dynamic_colors' ] );

        add_shortcode( 'ua_player', [ $this, 'render_player_shortcode' ] );
    }

    public function add_admin_menu() {
        add_menu_page(
            'UA Player',
            'UA Player',
            'manage_options',
            'ua-player',
            [ $this, 'settings_page' ],
            'dashicons-format-audio',
            60
        );

        add_submenu_page(
            'ua-player',
            'UA Player Colors',
            'Colors',
            'manage_options',
            'ua-player-colors',
            [ $this, 'colors_page' ]
        );
    }

    public function maybe_handle_save() {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }
        if ( empty( $_POST ) ) {
            return;
        }

        if ( isset( $_POST['ua_player_save_nonce'] ) && wp_verify_nonce( wp_unslash( $_POST['ua_player_save_nonce'] ), 'ua_player_save' ) ) {
            $raw = wp_unslash( $_POST['ua_player_saved_json'] ?? '' );
            $arr = json_decode( $raw, true );
            if ( ! is_array( $arr ) ) {
                $arr = [];
            }

            $sanitized = [];
            foreach ( $arr as $it ) {
                $img      = isset( $it['image'] ) ? esc_url_raw( $it['image'] ) : '';
                $title    = isset( $it['title'] ) ? sanitize_text_field( $it['title'] ) : '';
                $subtitle = isset( $it['subtitle'] ) ? sanitize_text_field( $it['subtitle'] ) : '';
                $audio    = isset( $it['audio'] ) ? esc_url_raw( $it['audio'] ) : '';

                if ( $img || $title || $audio || $subtitle ) {
                    $sanitized[] = [
                        'image'    => $img,
                        'title'    => $title,
                        'subtitle' => $subtitle,
                        'audio'    => $audio,
                    ];
                }
            }

            update_option( $this->option_name, $sanitized );
            add_settings_error( 'ua_player_messages', 'ua_player_saved', 'Playlist saved.', 'updated' );
        }
    }

    public function admin_enqueue( $hook ) {
        // Only enqueue on our plugin pages
        if ( strpos( $hook, 'ua-player' ) === false ) {
            return;
        }

        wp_enqueue_media();
        wp_enqueue_script( 'jquery' );

        $admin_js  = $this->plugin_url . 'admin.js';
        $admin_css = $this->plugin_url . 'admin.css';

        if ( file_exists( $this->plugin_dir . 'admin.js' ) ) {
            wp_enqueue_script( 'ua-player-admin', $admin_js, [ 'jquery' ], '1.1', true );
        }
        if ( file_exists( $this->plugin_dir . 'admin.css' ) ) {
            wp_enqueue_style( 'ua-player-admin-style', $admin_css, [], '1.1' );
        }

        // Pass saved playlist data to admin.js if script is enqueued
        if ( wp_script_is( 'ua-player-admin', 'enqueued' ) ) {
            $opt = get_option( $this->option_name, [] );
            wp_localize_script( 'ua-player-admin', 'uaPlayerAdminData', [
                'playlist' => $opt,
            ]);
        }
    }

    public function frontend_enqueue() {
        wp_enqueue_style( 'ua-fontawesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css', [], '6.4.2' );
        wp_enqueue_style( 'ua-swiper', 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css', [], '11' );
        wp_enqueue_script( 'ua-swiper', 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js', [], '11', true );

        if ( file_exists( $this->plugin_dir . 'style.css' ) ) {
            wp_enqueue_style( 'ua-player-style', $this->plugin_url . 'style.css', [ 'ua-swiper' ], '1.1' );
        }
        if ( file_exists( $this->plugin_dir . 'script.js' ) ) {
            wp_enqueue_script( 'ua-player-script', $this->plugin_url . 'script.js', [ 'jquery', 'ua-swiper' ], '1.1', true );
        }

        $items = get_option( $this->option_name, [] );
        if ( ! is_array( $items ) ) {
            $decoded = json_decode( $items, true );
            $items = is_array( $decoded ) ? $decoded : [];
        }

        $tracks = [];
        foreach ( $items as $it ) {
            $tracks[] = [
                'image'    => isset( $it['image'] ) ? esc_url( $it['image'] ) : '',
                'title'    => isset( $it['title'] ) ? esc_html( $it['title'] ) : '',
                'subtitle' => isset( $it['subtitle'] ) ? esc_html( $it['subtitle'] ) : '',
                'audio'    => isset( $it['audio'] ) ? esc_url( $it['audio'] ) : '',
            ];
        }

        if ( wp_script_is( 'ua-player-script', 'enqueued' ) ) {
            wp_localize_script( 'ua-player-script', 'uaPlayerData', [ 'tracks' => $tracks ] );
        }
    }

    public function colors_page() {
        if ( isset( $_POST['ua_colors_nonce'] ) && wp_verify_nonce( $_POST['ua_colors_nonce'], 'ua_colors_save' ) ) {
            update_option( 'ua_light_clr', sanitize_hex_color( $_POST['ua_light_clr'] ?? '#e5e5e5' ) );
            update_option( 'ua_primary_clr', sanitize_hex_color( $_POST['ua_primary_clr'] ?? '#6490f6' ) );
            update_option( 'ua_secondary_clr', sanitize_hex_color( $_POST['ua_secondary_clr'] ?? '#c1daff' ) );
            update_option( 'ua_active_clr', sanitize_hex_color( $_POST['ua_active_clr'] ?? '#9599ba' ) );
            update_option( 'ua_player_bg', sanitize_hex_color( $_POST['ua_player_bg'] ?? '#050933' ) );
            echo '<div class="updated"><p>Colors saved.</p></div>';
        }
        ?>
        <div class="wrap">
            <h1>UA Player Color Settings</h1>
            <form method="post">
                <?php wp_nonce_field( 'ua_colors_save', 'ua_colors_nonce' ); ?>
                <table class="form-table">
                    <tr><th>Light Color</th>
                        <td><input type="color" name="ua_light_clr" value="<?php echo esc_attr( get_option('ua_light_clr', '#e5e5e5') ); ?>"></td></tr>
                    <tr><th>Primary Color</th>
                        <td><input type="color" name="ua_primary_clr" value="<?php echo esc_attr( get_option('ua_primary_clr', '#6490f6') ); ?>"></td></tr>
                    <tr><th>Secondary Color</th>
                        <td><input type="color" name="ua_secondary_clr" value="<?php echo esc_attr( get_option('ua_secondary_clr', '#c1daff') ); ?>"></td></tr>
                    <tr><th>Active Color</th>
                        <td><input type="color" name="ua_active_clr" value="<?php echo esc_attr( get_option('ua_active_clr', '#9599ba') ); ?>"></td></tr>
                    <tr><th>Player Background</th>
                        <td><input type="color" name="ua_player_bg" value="<?php echo esc_attr( get_option('ua_player_bg', '#050933') ); ?>"></td></tr>
                </table>
                <?php submit_button( 'Save Colors' ); ?>
            </form>
        </div>
        <?php
    }

    public function output_dynamic_colors() {
        $light     = get_option( 'ua_light_clr', '#e5e5e5' );
        $primary   = get_option( 'ua_primary_clr', '#6490f6' );
        $secondary = get_option( 'ua_secondary_clr', '#c1daff' );
        $active    = get_option( 'ua_active_clr', '#9599ba' );
        $bg        = get_option( 'ua_player_bg', '#050933' );

        echo "<style>
            :root {
                --light-clr: {$light};
                --primary-clr: {$primary};
                --secondary-clr: {$secondary};
                --active-clr: {$active};
                --player-bg: {$bg};
            }
        </style>";
    }

    public function settings_page() {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }
        $opt  = get_option( $this->option_name, [] );
        $json = wp_json_encode( $opt );
        settings_errors( 'ua_player_messages' );
        ?>
        <div class="wrap ua-player-admin">
            <h1>UA Player Settings</h1>
            <form id="ua-player-settings-form" method="post" action="">
                <?php wp_nonce_field( 'ua_player_save', 'ua_player_save_nonce' ); ?>
                <div id="ua-player-items"></div>
                <input type="hidden" id="ua_player_saved_json" name="ua_player_saved_json" value="<?php echo esc_attr( $json ); ?>">
                <p>
                    <a href="#" id="ua-add-row" class="button button-primary">
                        <span class="dashicons dashicons-plus"></span> Add Item
                    </a>
                </p>
                <?php submit_button( 'Save Playlist' ); ?>
            </form>
        </div>
        <?php
    }

    public function render_player_shortcode() {
        $items = get_option( $this->option_name, [] );
        if ( ! is_array( $items ) ) {
            $decoded = json_decode( $items, true );
            $items = is_array( $decoded ) ? $decoded : [];
        }
        if ( empty( $items ) ) {
            return '<p>No tracks found. Add tracks in WP Admin → UA Player.</p>';
        }

        ob_start();
        ?>
        <div class="ua-player">
          <main>
            <div class="content">
              <div class="slider-playlist">
                <div class="swiper">
                  <div class="swiper-wrapper">
                    <?php foreach ( $items as $it ):
                        $img   = esc_url( $it['image'] ?? '' );
                        $title = esc_html( $it['title'] ?? '' );
                    ?>
                      <div class="swiper-slide">
                        <img src="<?php echo $img; ?>" alt="<?php echo $title; ?>">
                        <h1><?php echo $title; ?></h1>
                      </div>
                    <?php endforeach; ?>
                  </div>
                </div>

                <div class="playlist">
                  <?php foreach ( $items as $it ):
                      $img   = esc_url( $it['image'] ?? '' );
                      $title = esc_html( $it['title'] ?? '' );
                      $sub   = esc_html( $it['subtitle'] ?? '' );
                      $audio = esc_url( $it['audio'] ?? '' );
                  ?>
                    <div class="playlist-item" data-src="<?php echo $audio; ?>">
                      <img src="<?php echo $img; ?>" alt="<?php echo $title; ?>">
                      <div class="song">
                        <p class="song-title"><?php echo $title; ?></p>
                        <?php if ( $sub ) : ?>
                          <p class="song-subtitle"><?php echo $sub; ?></p>
                        <?php endif; ?>
                      </div>
                      <p class="duration">0:00</p>
                    </div>
                  <?php endforeach; ?>
                </div>
              </div>

              <div class="player">
                <audio id="audioPlayer" src="<?php echo esc_url( $items[0]['audio'] ?? '' ); ?>" type="audio/mpeg"></audio>
                <div class="controls">
                  <i class="fa-solid fa-shuffle" id="shuffleBtn"></i>
                  <i class="fa-solid fa-backward" id="prevBtn"></i>
                  <button id="playPauseBtn">
                    <i class="fa-solid fa-play" id="playPauseIcon"></i>
                  </button>
                  <i class="fa-solid fa-forward" id="nextBtn"></i>
                  <div class="volume">
                    <i class="fa-solid fa-volume-high"></i>
                    <input type="range" id="volume-range" min="0" max="100" value="100">
                  </div>
                </div>
                <input type="range" value="0" id="progress-bar">
              </div>
            </div>
          </main>
        </div>
        <?php
        return ob_get_clean();
    }
}

new UA_Player_Plugin();
