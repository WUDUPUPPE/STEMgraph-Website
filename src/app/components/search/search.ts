import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";

type SearchType = "challenges" |"keywords" | "chall-by-key" | "dependencies" | "subgraph";

@Component({
  selector: "app-search",
  imports: [FormsModule],
  templateUrl: "./search.html",
  styleUrl: "./search.css",
})

export class Search {
  private readonly router = inject(Router);

  searchTerm = "";
  searchType: SearchType = "challenges";

  submitSearch(): void {
  const query = this.searchTerm.trim();

  if (!query) {
    return;
  }

  switch (this.searchType) {
    case "chall-by-key":
      this.router.navigate(["/challenges"], {
        queryParams: { kw: query },
      });
      break;

    case "keywords":
      this.router.navigate(["/keywords"], {
        queryParams: { kw: query },
      });
      break;

    case "chall-by-key":
      this.router.navigate(["/challenges"], {
        queryParams: { kw: query },
      });
      break;

    case "dependencies":
      this.router.navigate(["/challenges"], {
        queryParams: { dependency: query },
      });
      break;

    case "subgraph":
      this.router.navigate(["/challenges"], {
        queryParams: { start: query },
      });
      break;
  }

  this.searchTerm = "";
}
}