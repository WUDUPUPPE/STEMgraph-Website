import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";

type SearchType = "all" | "keywords" | "challenges" | "lists" | "chall-by-key";

@Component({
  selector: "app-search",
  imports: [FormsModule],
  templateUrl: "./search.html",
  styleUrl: "./search.css",
})

export class Search {
  private readonly router = inject(Router);

  searchTerm = "";
  searchType: SearchType = "all";

  submitSearch(): void {
    const query = this.searchTerm.trim();

    if (!query) {
      return;
    }

    this.router.navigate(["/search"], {
      queryParams: {
        q: query,
        type: this.searchType,
        view: "list",
      },
    });
  };
}