"""Offline checks for the homepage's independently deployed project links."""
from html.parser import HTMLParser
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
PROJECTS = {
    "agentai-landing", "byse-full-suite", "reaction-diffusion-wasm",
    "aboutme", "project-1", "PageTest", "ui_shigure", "timeis",
}
EXPECTED_URLS = {f"https://rushiaismywaifu.github.io/{repo}/" for repo in PROJECTS}
REPOSITORIES = "https://github.com/rushiaismywaifu?tab=repositories"


class EcosystemParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_ecosystem = False
        self.sections = 0
        self.links = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "section" and attrs.get("id") == "ecosystem":
            self.in_ecosystem = True
            self.sections += 1
        if tag == "a" and self.in_ecosystem:
            self.links.append(attrs)

    def handle_endtag(self, tag):
        if tag == "section":
            self.in_ecosystem = False


class HomepageLinksTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.parser = EcosystemParser()
        cls.parser.feed((ROOT / "index.html").read_text(encoding="utf-8"))
        cls.cards = [link for link in cls.parser.links
                     if "card" in link.get("class", "").split()]

    def test_all_published_projects_have_one_absolute_link(self):
        self.assertEqual(self.parser.sections, 1)
        self.assertEqual(len(self.cards), len(EXPECTED_URLS))
        self.assertEqual({card["href"] for card in self.cards}, EXPECTED_URLS)

    def test_external_links_open_safely_in_a_new_tab(self):
        for link in self.parser.links:
            with self.subTest(url=link["href"]):
                self.assertEqual(link.get("target"), "_blank")
                self.assertTrue({"noopener", "noreferrer"} <= set(link.get("rel", "").split()))

    def test_repository_directory_is_available_without_javascript(self):
        self.assertEqual(sum(link.get("href") == REPOSITORIES
                             for link in self.parser.links), 1)

    def test_readme_documents_all_project_urls(self):
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        for url in EXPECTED_URLS:
            with self.subTest(url=url):
                self.assertIn(url, readme)


if __name__ == "__main__":
    unittest.main()
