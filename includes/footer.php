<?php
/**
 * Shared Application Footer
 */
$is_app_layout = $is_app_layout ?? true;
?>

<?php if ($is_app_layout): ?>
    </main> <!-- end .page-body -->
  </div> <!-- end .main-content -->
</div> <!-- end .app-container -->
<?php else: ?>
  <!-- Public Footer for Landing Page / General Pages -->
  <footer class="public-footer">
    <div class="footer-container">
      <div class="footer-col">
        <div class="brand-logo" style="margin-bottom: 14px;">
          <div class="brand-icon-gold">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
          </div>
          <div class="brand-title-group">
            <span class="brand-title">THE ARCHIVE</span>
            <span class="brand-sub">IIIT KOTA · DIGITAL LIBRARY</span>
          </div>
        </div>
        <p style="font-size: 0.9rem; line-height: 1.6; color: #94a3b8; max-width: 320px;">
          Where learning goes beyond classrooms. Central academic digital library portal for IIIT Kota students and faculty.
        </p>
      </div>

      <div class="footer-col">
        <h4>Navigation</h4>
        <ul class="footer-links">
          <li><a href="<?= $base_path ?>index.php">Home</a></li>
          <li><a href="<?= $base_path ?>index.php#catalog">Book Catalog</a></li>
          <li><a href="<?= $base_path ?>index.php#categories">Featured Categories</a></li>
          <li><a href="<?= $base_path ?>index.php#features">About The Archive</a></li>
        </ul>
      </div>

      <div class="footer-col">
        <h4>Portals</h4>
        <ul class="footer-links">
          <li><a href="<?= $base_path ?>login.php">Student / Admin Login</a></li>
          <li><a href="<?= $base_path ?>register.php">Student Registration</a></li>
        </ul>
      </div>

      <div class="footer-col">
        <h4>Library Desk & Support</h4>
        <p style="font-size: 0.88rem; line-height: 1.6; color: #94a3b8;">
          Monday – Saturday: 8:00 AM – 8:00 PM<br>
          Sunday: 10:00 AM – 4:00 PM<br>
          Email: <code>library@iiitkota.ac.in</code>
        </p>
      </div>
    </div>

    <div class="footer-bottom">
      <div>&copy; <?= date('Y') ?> THE ARCHIVE · IIIT KOTA DIGITAL LIBRARY.</div>
      <div>Designed with HTML5, CSS3, Core PHP &amp; MySQL.</div>
    </div>
  </footer>
<?php endif; ?>

</body>
</html>
