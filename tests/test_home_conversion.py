import re
import unittest
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class HomeParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = []
        self.depth = 0
        self.plan_guide_depth = None
        self.plan_guide_items = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.append((tag, attrs))
        if attrs.get("class") == "plan-guide":
            self.plan_guide_depth = self.depth
        elif tag == "li" and self.plan_guide_depth is not None:
            self.plan_guide_items += 1
        self.depth += 1

    def handle_endtag(self, tag):
        self.depth -= 1
        if self.plan_guide_depth is not None and self.depth == self.plan_guide_depth:
            self.plan_guide_depth = None

    def find_by_id(self, element_id):
        return next((item for item in self.tags if item[1].get("id") == element_id), None)

    def find_by_class(self, class_name):
        return [item for item in self.tags if class_name in item[1].get("class", "").split()]


class HomeConversionContractTests(unittest.TestCase):
    def setUp(self):
        self.html = (ROOT / "index.html").read_text(encoding="utf-8")
        self.css = (ROOT / "styles.css").read_text(encoding="utf-8")
        self.js = (ROOT / "app.js").read_text(encoding="utf-8")
        self.dom = HomeParser()
        self.dom.feed(self.html)

    def test_mobile_navigation_has_an_accessible_disclosure_contract(self):
        toggle = self.dom.find_by_id("nav-menu-toggle")
        menu = self.dom.find_by_id("primary-navigation")

        self.assertIsNotNone(toggle)
        self.assertEqual(toggle[0], "button")
        self.assertEqual(toggle[1].get("aria-controls"), "primary-navigation")
        self.assertEqual(toggle[1].get("aria-expanded"), "false")
        self.assertIsNotNone(menu)
        self.assertIn("nav-toggle", self.css)
        self.assertIn("navMenuToggle.addEventListener", self.js)

    def test_mobile_menu_label_is_available_to_screen_readers_without_being_visible(self):
        self.assertRegex(
            self.css,
            re.compile(r"\.sr-only\s*\{[^}]*position:absolute[^}]*clip:rect\(0,0,0,0\)", re.DOTALL),
        )

    def test_hero_exposes_clickable_google_proof_and_specific_offer(self):
        proof = self.dom.find_by_class("google-proof")

        self.assertEqual(len(proof), 1)
        self.assertEqual(proof[0][0], "a")
        self.assertEqual(proof[0][1].get("href"), "https://share.google/kcG03yAl2QiHq6T3Y")
        self.assertEqual(proof[0][1].get("target"), "_blank")
        self.assertIn("transformam cliques em conversas no WhatsApp", self.html)

    def test_offer_includes_human_handoff_and_four_plan_decision_cues(self):
        self.assertEqual(len(self.dom.find_by_class("offer-team-note")), 1)
        self.assertEqual(len(self.dom.find_by_class("plan-guide")), 1)
        self.assertEqual(self.dom.plan_guide_items, 4)
        self.assertRegex(self.html, re.compile(r'href="#quem"[^>]*>.*(?:Welber|Caio)', re.DOTALL))

    def test_plan_guide_is_reserved_for_the_mobile_breakpoint(self):
        self.assertRegex(self.css, r"\.plan-guide\{display:none")
        self.assertRegex(
            self.css,
            re.compile(r"@media \(max-width:680px\)\{.*?\.plan-guide\{display:grid", re.DOTALL),
        )

    def test_general_delivery_copy_uses_the_24_hour_average(self):
        self.assertIn("Start e Pro com entrega média em 24 horas.", self.html)
        self.assertNotIn("a partir de 72h", self.html)
        self.assertIn("Entrega em até 72h após pagamento e briefing", self.html)
        self.assertIn("no ar em até 5 dias úteis", self.html)

    def test_delivery_average_explains_that_each_plan_has_its_own_deadline(self):
        self.assertGreaterEqual(
            self.html.count("Start e Pro: média de 24h; prazo máximo conforme o plano."),
            2,
        )
        self.assertNotIn("<span>Brasília, DF</span>", self.html)

    def test_mobile_hero_keeps_compact_facts_on_one_line(self):
        self.assertIn('class="hero-facts-mobile"', self.html)
        self.assertIn('white-space:nowrap', self.css)

    def test_mobile_pain_uses_a_compact_visual_story_instead_of_three_copy_cards(self):
        self.assertIn('class="dor-mobile-story"', self.html)
        self.assertIn('O anúncio chama', self.html)
        self.assertIn('O cliente clica interessado', self.html)
        self.assertIn('Sem página, a conversa não acontece', self.html)

    def test_mobile_virada_and_team_note_gain_visual_hierarchy(self):
        self.assertIn('counter-reset:virada', self.css)
        self.assertIn('offer-team-names', self.html)
        self.assertIn('offer-team-actions', self.html)
        self.assertIn('text-align:center', self.css)

    def test_portfolio_starts_with_the_requested_stronger_examples(self):
        cards = re.findall(r'<a class="case-card" href="([^"]+)"', self.html)
        self.assertEqual(
            cards[:4],
            [
                'https://dr-bruno-rabello.pages.dev',
                'https://sakuraprime.base44.app',
                'https://vivendo-aventuras-luciana.pages.dev',
                'https://taf-elite.pages.dev',
            ],
        )

    def test_pro_is_the_highlighted_mobile_plan_between_start_and_premium(self):
        self.assertRegex(
            self.html,
            re.compile(
                r'<article class="plan">.*?plan-name">Start.*?'
                r'<article class="plan plan-featured">.*?plan-name">Pro.*?'
                r'<article class="plan">.*?plan-name">Premium.*?'
                r'<article class="plan">.*?plan-name">Premium IA',
                re.DOTALL,
            ),
        )
        self.assertNotIn('.plan-featured{order:-1}', self.css)
        self.assertIn('focusProPlanOnMobile', self.js)

    def test_scroll_return_does_not_dim_the_hero_or_rebase_sunset_on_faq_height(self):
        self.assertNotIn("y: -60, opacity: 0.25", self.js)
        self.assertNotIn("astronomy.fim.bottom - h", self.js)
        self.assertIn("astronomy.faq.top + h * 1.8", self.js)
        self.assertIn("if (d.closest('#faq')) return;", self.js)

    def test_mobile_final_cta_uses_a_compact_horizontal_contract(self):
        self.assertIn('.btn-final{', self.css)
        self.assertIn('white-space:nowrap', self.css)
        self.assertIn('width:auto', self.css)

    def test_lost_click_scene_shows_the_missing_next_step(self):
        self.assertEqual(len(self.dom.find_by_class("dor-page-missing")), 1)
        self.assertEqual(len(self.dom.find_by_class("dor-click-path")), 1)
        self.assertEqual(len(self.dom.find_by_class("dor-route-break")), 1)
        self.assertIn("Sem uma página, o interesse", self.html)
        self.assertIn("não encontra um próximo passo.", self.html)
        self.assertIn("0 conversas iniciadas", self.html)

    def test_astronomy_uses_independent_sun_and_moon_cycles(self):
        self.assertIn("gsap.set('#lua'", self.js)
        self.assertIn("gsap.set('#sol'", self.js)
        self.assertIn("function moonSetX()", self.js)
        self.assertIn("function sunDayX()", self.js)
        self.assertIn("function syncAstronomy()", self.js)
        self.assertIn("astronomy.faq.top", self.js)
        self.assertNotIn("var astroSegs = []", self.js)

    def test_astronomy_uses_a_subtle_moon_dusk_curve(self):
        self.assertIn("var moonDuskOpacity = 0.06 + 0.94 * Math.pow(sunset, 2.4);", self.js)
        self.assertIn("var sunDuskOpacity = 1 - sunset * 0.15;", self.js)
        self.assertIn("sunOpacity = sunDuskOpacity", self.js)


if __name__ == "__main__":
    unittest.main()
