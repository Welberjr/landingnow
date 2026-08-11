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
