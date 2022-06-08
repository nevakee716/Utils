/* Copyright � 2012-2017 erwin, Inc. - All rights reserved */
/*jslint nomen: true */
/*global cwAPI,$,_,moment*/

(function (cwApi) {
  "use strict";

  var cwPdf = function (name) {
    this.index = 0;
    this.results = [];
    this.inTab = false;
    this.name = name;
    this.title = name;
  };

  cwPdf.prototype.setPdfDimension = function () {
    this.HTML_Width = this.results.reduce((pV, r) => {
      return Math.max(
        pV,
        Math.max.apply(
          Math,
          r.outputs.map((r) => r.width)
        )
      );
    }, 0);
    this.padding = (this.HTML_Width * 2) / 100;
    this.PDF_Width = this.HTML_Width + 2 * this.padding;
    this.PDF_Height = this.PDF_Width * 1.5 + 2 * this.padding;

    this.titlePadding = 0; //(this.PDF_Height * 5) / 100;
  };

  cwPdf.prototype.initJsPdf = function () {
    this.setPdfDimension();
    this.pdf = new cwJsPdf.jsPDF("p", "pt", [this.PDF_Width, this.PDF_Height]);
  };

  cwPdf.prototype.getPdf = async function () {
    cwAPI.siteLoadingPageStart();

    var tabs = document.querySelector(".navViews")
      ? document.querySelectorAll(".navViews > .selected .cwTabLink.selected")
      : document.querySelectorAll(".cwTabLink.selected");

    if (
      document.querySelectorAll(".cw-accordion.fa.fa-plus").length > 0 ||
      document.querySelectorAll(".cw-list-subtitle.cw-accordion-header").length > 0
    ) {
      $(".cw-accordion.fa.fa-plus").click();
      $(".cw-list-subtitle.cw-accordion-header").click();
      await cwAPI.customLibs.utils.timeout(2000);
    }

    if (tabs.length > 0) {
      this.inTab = true;
      this.title = `${this.name} - ${tabs[0].firstChild.innerHTML}`;
    }
    let r = await this.createPDFFromZone();

    this.results.push({ outputs: r, title: this.title });
    await cwAPI.customLibs.utils.timeout(2000);
    this.initJsPdf();

    this.results.forEach((r) => {
      if (this.index != 0) this.pdf.addPage();
      this.index = 0;
      // this.pdf.text(20, 20, r.title);
      r.outputs.forEach((s) => {
        if (this.index != 0 && !s.noSkipPage) this.pdf.addPage();
        if (s.type === "table")
          cwJsPdf.autoTable(this.pdf, {
            html: s.toRender,
          });
        else if (s.type === "img") {
          this.renderImage(s);
        }
        if (s.toShow) $(s.toShow).show();
      });
      this.index++;
    });
    await this.downloadPdf();
    window.location.reload();
  };

  cwPdf.prototype.downloadPdf = function (callback) {
    return this.pdf.save(`${this.title}.pdf`, { returnPromise: true });
  };

  cwPdf.prototype.getImgByCanva = async function (selector) {
    let zone = $(selector);
    let canvas = await cwJsPdf.html2canvas(zone[0], { allowTaint: true });
    canvas.getContext("2d");
    var imgData = canvas.toDataURL("image/jpeg", 1.0);
    return {
      type: "img",
      imgType: "jpeg",
      data: imgData,
      width: zone.width(),
      height: zone.height(),
    };
  };

  cwPdf.prototype.createPDFFromZone = function () {
    var self = this;
    return new Promise(async (resolve) => {
      let results = [],
        result;
      const tabSelector = self.inTab ? ".tab-content.visible" : "";
      // remove other tabs
      $(".tab-content:not(.visible)").remove();
      //diagrams
      let diagramZones = document.querySelectorAll(tabSelector + " ul.cw-diagram-zone");
      if (diagramZones.length > 0) {
        for (let i = 0; i < diagramZones.length; ++i) {
          let r = await cwAPI.customLibs.utils.getImgFromDiagram(diagramZones[i].id.replaceAll("cw-diagram-zone-", ""));
          diagramZones[i].style.display = "none";
          results.push({
            type: "img",
            imgType: "png",
            data: r.data,
            toShow: `#${diagramZones[i].id}`,
            width: r.width,
            height: r.height,
          });
        }
      }

      //complexe Table
      let complexeTablezones = document.querySelectorAll(tabSelector + " .wrap-kendo-mobile");
      if (complexeTablezones.length > 0) {
        for (let i = 0; i < complexeTablezones.length; ++i) {
          let selector = "." + complexeTablezones[i].firstChild.className.replaceAll("  ", ".").replaceAll(" ", ".");

          let kendo = $(selector).data("kendoGrid");
          kendo.columns
            .filter((c) => c.locked && c.field)
            .map((c) => c.field)
            .reverse()
            .forEach((title) => kendo.unlockColumn(title));
          let dataSource = kendo.dataSource;
          let total = dataSource.total();
          dataSource.pageSize(total);

          $(selector + " .htmlbox-header-icon .fa.fa-plus")
            .closest(".htmlbox-header")
            .click();
          await cwAPI.customLibs.utils.timeout(2000);

          result = await this.getImgByCanva(selector + " .k-grid-header-wrap table");
          results.push(result);
          var offset = result.height;
          result = await this.getImgByCanva(selector + " .k-grid-content table");
          result.noSkipPage = true;
          result.offset = offset;
          results.push(result);
          complexeTablezones[i].style.display = "none";
        }
      }

      //pivot Table
      if (document.querySelector(tabSelector + " .pvtTable")) {
        let pivotSelectors = $(".pvtTable")
          .closest(".cwPivotWrapper")
          .hide()
          .map(function () {
            return {
              type: "table",
              toRender: `#${this.id} .pvtTable`,
              toShow: `#${this.id}`,
              width: 0,
            };
          })
          .get();
        results = results.concat(pivotSelectors);
      }

      //network
      let networkZone = document.querySelectorAll(tabSelector + " .cwLayoutNetwork");
      if (networkZone.length > 0) {
        for (let i = 0; i < networkZone.length; ++i) {
          let r = await cwAPI.customLibs.utils.getImgFromNetwork(networkZone[i].id.replaceAll("cwLayoutNetwork", ""));
          results.push({
            type: "img",
            imgType: "png",
            data: r.data,
            toShow: `#${this.id}`,
            width: r.width,
            height: r.height,
          });
          networkZone[i].style.display = "none";
        }
      }

      result = await this.getImgByCanva(".cw-zone");
      results.unshift(result);
      resolve(results);
    });
  };

  cwPdf.prototype.renderImage = function (toRender) {
    let type = toRender.imgType ?? "jpeg";
    if (toRender.data != "data:,") {
      toRender.height = (toRender.height * this.HTML_Width) / toRender.width;
      toRender.width = this.HTML_Width;
      this.index++;
      let position = this.titlePadding + this.padding + (toRender.offset ?? 0); // give some top padding to first page
      let heightLeft = toRender.height + this.titlePadding;
      console.log(`add image ${this.padding} ${position} ${toRender.width} ${toRender.height}`);
      this.pdf.addImage(toRender.data, type, this.padding, position, toRender.width, toRender.height);
      heightLeft -= this.PDF_Height + this.padding;
      let p = 1;
      while (heightLeft >= 0) {
        position -= this.PDF_Height; // top padding for other pages
        this.pdf.addPage();
        p++;
        console.log(`add page ${p} // position ${position}`);
        this.pdf.addImage(toRender.data, type, this.padding, position, toRender.width, toRender.height);
        heightLeft -= this.PDF_Height;
      }
    }
  };

  if (cwAPI.customLibs === undefined) {
    cwAPI.customLibs = {};
  }

  if (cwAPI.customLibs.utils === undefined) {
    cwAPI.customLibs.utils = {};
  }

  cwApi.customLibs.utils.cwPdf = cwPdf;
})(cwAPI, moment);
