import { Injectable, inject } from "@angular/core";
import { from } from 'rxjs';
import { Api } from '../api/api';
import { databasecheckDatabasecheckGet, getGraphGraphGet, getListListGet, healthcheckHealthcheckGet, getChallengeContentChallengesIdContentGet, downloadAssetChallengesIdAssetsFileNameGet, getKeywordsGraphKeywordsGraphGet, getKeywordsListKeywordsListGet } from "../api/functions";

@Injectable({
  providedIn: 'root',
})

export class STEMgraphApiService {
  private readonly api = inject(Api);

  Healthcheck() {
    return from(this.api.invoke(healthcheckHealthcheckGet));
  };

  Databasecheck() {
    return from(this.api.invoke(databasecheckDatabasecheckGet));
  };

  MainGraph() {
    return from(this.api.invoke(getGraphGraphGet));
  };

  MainList() {
    return from(this.api.invoke(getListListGet));
  };

  KeywordsGraph(){
    return from(this.api.invoke(getKeywordsGraphKeywordsGraphGet));
  };

  KeywordsList(){
    return from(this.api.invoke(getKeywordsListKeywordsListGet));
  };

  ChallengeContent(id: string) {
    return from(this.api.invoke(getChallengeContentChallengesIdContentGet,
        {
          id,
        },
      ),
    );
  };

  DownloadAsset(id: string, fileName: string) {
    return from(this.api.invoke(downloadAssetChallengesIdAssetsFileNameGet,
        {
          id,
          file_name: fileName,
        },
      ),
    );
  };
}
