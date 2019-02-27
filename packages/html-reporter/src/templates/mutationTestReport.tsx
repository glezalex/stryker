/// <reference path="./mutation-test-report-element.ts"/>
import * as typedHtml from 'typed-html';

export function mutationTestReport(reportJsonLocation: string, mutationTestElementsFileName: string) {
    return '<!DOCTYPE html>\n' + <html>
        <head>
            <script src={mutationTestElementsFileName}></script>
        </head>
        <body>
            <mutationTestReportApp src={reportJsonLocation}></mutationTestReportApp>
        </body>
    </html>;
}
