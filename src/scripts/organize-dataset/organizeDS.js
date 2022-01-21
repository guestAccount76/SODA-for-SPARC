const { BrowserWindow } = require("electron");

//// option to show tool-tips for high-level folders
function showTooltips(ev) {
  var folderName = ev.parentElement.innerText;
  Swal.fire({
    icon: "info",
    html: highLevelFolderToolTip[folderName],
    heightAuto: false,
    backdrop: "rgba(0,0,0, 0.4)",
    showClass: {
      popup: "animate__animated animate__fadeInDown animate__faster",
    },
    hideClass: {
      popup: "animate__animated animate__fadeOutUp animate_fastest",
    },
  });
}

const recursive_mark_sub_files_deleted = (dataset_folder, mode) => {
  if ("files" in dataset_folder) {
    for (let file in dataset_folder["files"]) {
      if ("forTreeview" in dataset_folder["files"][file]) {
        continue;
      }
      if (mode === "delete") {
        if (
          !dataset_folder["files"][file]["action"].includes("recursive_deleted")
        ) {
          dataset_folder["files"][file]["action"].push("recursive_deleted");
        }
      } else if (mode === "restore") {
        if (
          dataset_folder["files"][file]["action"].includes("recursive_deleted")
        ) {
          let index =
            dataset_folder["files"][file]["action"].indexOf(
              "recursive_deleted"
            );
          dataset_folder["files"][file]["action"].splice(index, 1);
        }
      }
    }
  }
  if (
    "folders" in dataset_folder &&
    Object.keys(dataset_folder["folders"]).length !== 0
  ) {
    for (let folder in dataset_folder["folders"]) {
      recursive_mark_sub_files_deleted(dataset_folder["folders"][folder], mode);
      if ("action" in dataset_folder["folders"][folder]) {
        if (mode === "delete") {
          if (
            !dataset_folder["folders"][folder]["action"].includes(
              "recursive_deleted"
            )
          ) {
            dataset_folder["folders"][folder]["action"].push(
              "recursive_deleted"
            );
          }
        } else if (mode === "restore") {
          if (
            dataset_folder["folders"][folder]["action"].includes(
              "recursive_deleted"
            )
          ) {
            let index =
              dataset_folder["folders"][folder]["action"].indexOf(
                "recursive_deleted"
              );
            dataset_folder["folders"][folder]["action"].splice(index, 1);
          }
        }
      }
    }
  }
};

///////// Option to delete folders or files
function delFolder(
  ev,
  organizeCurrentLocation,
  uiItem,
  singleUIItem,
  inputGlobal
) {
  var itemToDelete = ev.parentElement.innerText;
  var promptVar;
  var type; // renaming files or folders

  if (ev.classList.value.includes("myFile")) {
    promptVar = "file";
    type = "files";
  } else if (ev.classList.value.includes("myFol")) {
    promptVar = "folder";
    type = "folders";
  }

  // selected-item class will always be in multiples of two
  if ($(".selected-item").length > 2) {
    type = "items";
  }

  if (ev.classList.value.includes("deleted")) {
    if (ev.classList.value.includes("selected-item") && type === "items") {
      Swal.fire({
        title: `Restore ${type}`,
        icon: "warning",
        text: "You can only restore one file at a time. Please select a single file for restoration.",
        heightAuto: false,
        backdrop: "rgba(0,0,0, 0.4)",
        showClass: {
          popup: "animate__animated animate__zoomIn animate__faster",
        },
        hideClass: {
          popup: "animate__animated animate__zoomOut animate__faster",
        },
      });
      return;
    }
    if (ev.classList.value.includes("recursive_deleted_file")) {
      Swal.fire({
        title: `Restore ${type}`,
        icon: "warning",
        text: "The parent folder for this item has been marked for deletion. Please restore that folder to recover this item.",
        heightAuto: false,
        backdrop: "rgba(0,0,0, 0.4)",
        showClass: {
          popup: "animate__animated animate__zoomIn animate__faster",
        },
        hideClass: {
          popup: "animate__animated animate__zoomOut animate__faster",
        },
      });
      return;
    }

    // Handle file/folder restore
    Swal.fire({
      icon: "warning",
      title: `Restore ${promptVar}`,
      text: `Are you sure you want to restore this ${promptVar}? If any ${promptVar} of the same name has been added, this restored ${promptVar} will be renamed.`,
      showCancelButton: true,
      cancelButtonText: "Cancel",
      confirmButtonText: "OK",
      heightAuto: false,
      backdrop: "rgba(0,0,0, 0.4)",
      reverseButtons: reverseSwalButtons,
      showClass: {
        popup: "animate__animated animate__zoomIn animate__faster",
      },
      hideClass: {
        popup: "animate__animated animate__zoomOut animate__faster",
      },
    }).then((result) => {
      if (result.isConfirmed) {
        let itemToRestore = itemToDelete;
        var filtered = getGlobalPath(organizeCurrentLocation);

        var myPath = getRecursivePath(filtered.slice(1), inputGlobal);

        if (filtered.length == 1) {
          let itemToRestore_new_key = itemToRestore.substring(
            0,
            itemToRestore.lastIndexOf("-")
          );
          if (itemToRestore_new_key in myPath[type]) {
            Swal.fire({
              title: `Unable to restore ${type}`,
              icon: "warning",
              text: "There already exists a high level folder with the same name. Please remove that folder before you restore this one.",
              heightAuto: false,
              backdrop: "rgba(0,0,0, 0.4)",
              showClass: {
                popup: "animate__animated animate__zoomIn animate__faster",
              },
              hideClass: {
                popup: "animate__animated animate__zoomOut animate__faster",
              },
            });
            return;
          }
        }

        if (type === "folders") {
          recursive_mark_sub_files_deleted(
            myPath[type][itemToDelete],
            "restore"
          );
        }

        // update Json object with the restored object
        let index = myPath[type][itemToRestore]["action"].indexOf("deleted");
        myPath[type][itemToRestore]["action"].splice(index, 1);
        let itemToRestore_new_key = itemToRestore.substring(
          0,
          itemToRestore.lastIndexOf("-")
        );

        // Add a (somenumber) if the file name already exists
        // Done using a loop to avoid a case where the same file number exists
        if (itemToRestore_new_key in myPath[type]) {
          myPath[type][itemToRestore]["action"].push("renamed");
          itemToRestore_new_key_file_name = path.parse(
            itemToRestore_new_key
          ).name;
          itemToRestore_new_key_file_ext = path.parse(
            itemToRestore_new_key
          ).ext;
          file_number = 1;
          while (true) {
            itemToRestore_potential_new_key =
              itemToRestore_new_key_file_name +
              " (" +
              file_number +
              ")" +
              itemToRestore_new_key_file_ext;
            if (!myPath[type].hasOwnProperty(itemToRestore_potential_new_key)) {
              itemToRestore_new_key = itemToRestore_potential_new_key;
              break;
            }
            file_number++;
          }
        }

        // Add the restored item with the new file name back into the object.
        myPath[type][itemToRestore_new_key] = myPath[type][itemToRestore];
        delete myPath[type][itemToRestore];

        // update UI with updated jsonobj
        listItems(myPath, uiItem);
        getInFolder(singleUIItem, uiItem, organizeCurrentLocation, inputGlobal);
      }
    });
  } else {
    if (type === "items") {
      Swal.fire({
        icon: "warning",
        title: `Delete ${promptVar}`,
        text: `Are you sure you want to delete these ${type}?`,
        heightAuto: false,
        backdrop: "rgba(0,0,0, 0.4)",
        showCancelButton: true,
        focusCancel: true,
        confirmButtonText: `Delete ${type}`,
        cancelButtonText: "Cancel",
        reverseButtons: reverseSwalButtons,
        showClass: {
          popup: "animate__animated animate__zoomIn animate__faster",
        },
        hideClass: {
          popup: "animate__animated animate__zoomOut animate__faster",
        },
      }).then((result) => {
        if (result.isConfirmed) {
          var filtered = getGlobalPath(organizeCurrentLocation);
          var myPath = getRecursivePath(filtered.slice(1), inputGlobal);

          $("div.single-item.selected-item > .folder_desc").each(function (
            index,
            current_element
          ) {
            itemToDelete = $(current_element).text();
            if (itemToDelete in myPath["files"]) {
              type = "files";
            } else if (itemToDelete in myPath["folders"]) {
              type = "folders";
            }
            if (
              myPath[type][itemToDelete]["type"] === "bf" ||
              (myPath[type][itemToDelete]["type"] === "local" &&
                myPath[type][itemToDelete]["action"].includes("existing"))
            ) {
              if (type === "folders") {
                recursive_mark_sub_files_deleted(
                  myPath[type][itemToDelete],
                  "delete"
                );
              }

              if (!myPath[type][itemToDelete]["action"].includes("deleted")) {
                myPath[type][itemToDelete]["action"] = [];
                myPath[type][itemToDelete]["action"].push("existing");
                myPath[type][itemToDelete]["action"].push("deleted");
                let itemToDelete_new_key = itemToDelete + "-DELETED";
                myPath[type][itemToDelete_new_key] = myPath[type][itemToDelete];
                delete myPath[type][itemToDelete];
              }
            } else {
              delete myPath[type][itemToDelete];
            }
          });

          // update UI with updated jsonobj
          listItems(myPath, uiItem);
          getInFolder(
            singleUIItem,
            uiItem,
            organizeCurrentLocation,
            inputGlobal
          );
        }
      });
    } else {
      Swal.fire({
        icon: "warning",
        title: `Delete ${promptVar}`,
        text: `Are you sure you want to delete this ${promptVar}?`,
        heightAuto: false,
        backdrop: "rgba(0,0,0, 0.4)",
        showCancelButton: true,
        focusCancel: true,
        confirmButtonText: `Delete ${promptVar}`,
        cancelButtonText: "Cancel",
        reverseButtons: reverseSwalButtons,
        showClass: {
          popup: "animate__animated animate__zoomIn animate__faster",
        },
        hideClass: {
          popup: "animate__animated animate__zoomOut animate__faster",
        },
      }).then((result) => {
        if (result.isConfirmed) {
          /// get current location of folders or files
          var filtered = getGlobalPath(organizeCurrentLocation);
          var myPath = getRecursivePath(filtered.slice(1), inputGlobal);
          // update Json object with new folder created
          if (
            myPath[type][itemToDelete]["type"] === "bf" ||
            (myPath[type][itemToDelete]["type"] === "local" &&
              myPath[type][itemToDelete]["action"].includes("existing"))
          ) {
            if (type === "folders") {
              recursive_mark_sub_files_deleted(
                myPath[type][itemToDelete],
                "delete"
              );
            }

            if (!myPath[type][itemToDelete]["action"].includes("deleted")) {
              myPath[type][itemToDelete]["action"] = [];
              myPath[type][itemToDelete]["action"].push("existing");
              myPath[type][itemToDelete]["action"].push("deleted");
              let itemToDelete_new_key = itemToDelete + "-DELETED";
              myPath[type][itemToDelete_new_key] = myPath[type][itemToDelete];
              delete myPath[type][itemToDelete];
            }
          } else {
            delete myPath[type][itemToDelete];
          }
          // update UI with updated jsonobj
          listItems(myPath, uiItem);
          getInFolder(
            singleUIItem,
            uiItem,
            organizeCurrentLocation,
            inputGlobal
          );
        }
      });
    }
  }
}

// helper function to rename files/folders
function checkValidRenameInput(
  event,
  input,
  type,
  oldName,
  newName,
  itemElement
  // myBootboxDialog
) {
  double_extensions = [
    ".ome.tiff",
    ".ome.tif",
    ".ome.tf2,",
    ".ome.tf8",
    ".ome.btf",
    ".ome.xml",
    ".brukertiff.gz",
    ".mefd.gz",
    ".moberg.gz",
    ".nii.gz",
    ".mgh.gz",
    ".tar.gz",
    ".bcl.gz",
  ];

  var duplicate = false;
  // if renaming a file
  if (type === "files") {
    let double_ext_present = false;
    for (let index in double_extensions) {
      if (oldName.search(double_extensions[index]) != -1) {
        newName =
          input.trim() +
          path.parse(path.parse(oldName).name).ext +
          path.parse(oldName).ext;
        double_ext_present = true;
        break;
      }
    }
    if (double_ext_present == false) {
      newName = input.trim() + path.parse(oldName).ext;
    }
    // check for duplicate or files with the same name
    for (var i = 0; i < itemElement.length; i++) {
      if (!itemElement[i].innerText.includes("-DELETED")) {
        if (newName === path.parse(itemElement[i].innerText).base) {
          duplicate = true;
          break;
        }
      }
    }
    if (duplicate) {
      Swal.fire({
        icon: "error",
        text: `The file name: ${newName} already exists, please rename to a different name!`,
        backdrop: "rgba(0,0,0, 0.4)",
        heightAuto: false,
      });
      newName = "";
    }
    //// if renaming a folder
  } else {
    newName = input.trim();
    // check for duplicate folder as shown in the UI
    for (var i = 0; i < itemElement.length; i++) {
      if (input.trim() === itemElement[i].innerText) {
        duplicate = true;
        break;
      }
    }
    var itemDivElements = document.getElementById("items").children;
    renameFolder(this, organizeCurrentLocation, itemDivElements);
    if (duplicate) {
      Swal.fire({
        icon: "error",
        text: `The folder name: ${newName} already exists, please rename to a different name!`,
        backdrop: "rgba(0,0,0, 0.4)",
        heightAuto: false,
      });
      newName = "";
    }
  }
  return newName;
}

///// Option to rename a folder and files
function renameFolder(
  event1, //this
  organizeCurrentLocation, //current section of My_folder
  itemElement, //the elements in the container with items
  inputGlobal, //datasetStructureJSONObj
  uiItem, //container with the folders
  singleUIItem //class name
) {
  var promptVar;
  var type; // renaming files or folders
  var newName;
  var currentName = event1.parentElement.innerText;
  var nameWithoutExtension;
  var highLevelFolderBool;
  console.log(
    "Parameters of renameFolder\n" +
      event1.value +
      "\nEVENT 1 END\n" +
      organizeCurrentLocation.value +
      "\norganizeCurrentLocation END\n" +
      itemElement.length +
      "\nitem element END\n" +
      JSON.stringify(inputGlobal) +
      "\niput global END\n" +
      JSON.stringify(uiItem) +
      "\nuiItem END\n" +
      JSON.stringify(singleUIItem) +
      "\nsingleUIItem END\n"
  );

  double_extensions = [
    ".ome.tiff",
    ".ome.tif",
    ".ome.tf2,",
    ".ome.tf8",
    ".ome.btf",
    ".ome.xml",
    ".brukertiff.gz",
    ".mefd.gz",
    ".moberg.gz",
    ".nii.gz",
    ".mgh.gz",
    ".tar.gz",
    ".bcl.gz",
  ];

  if (highLevelFolders.includes(currentName)) {
    highLevelFolderBool = true;
  } else {
    highLevelFolderBool = false;
  }

  if (event1.classList[0] === "myFile") {
    promptVar = "file";
    type = "files";
  } else if (event1.classList[0] === "myFol") {
    promptVar = "folder";
    type = "folders";
  }
  if (type === "files") {
    let double_ext_present = false;
    for (let index in double_extensions) {
      if (currentName.search(double_extensions[index]) != -1) {
        nameWithoutExtension = path.parse(path.parse(currentName).name).name;
        double_ext_present = true;
        break;
      }
    }
    if (double_ext_present == false) {
      nameWithoutExtension = path.parse(currentName).name;
    }
  } else {
    nameWithoutExtension = currentName;
  }

  if (highLevelFolderBool) {
    Swal.fire({
      icon: "warning",
      text: "High-level SPARC folders cannot be renamed!",
      heightAuto: false,
      backdrop: "rgba(0,0,0, 0.4)",
      showClass: {
        popup: "animate__animated animate__zoomIn animate__faster",
      },
      hideClass: {
        popup: "animate__animated animate__zoomOut animate__faster",
      },
    });
  } else {
    Swal.fire({
      title: `Rename ${promptVar}`,
      text: "Please enter a new name:",
      input: "text",
      inputValue: nameWithoutExtension,
      heightAuto: false,
      backdrop: "rgba(0,0,0, 0.4)",
      showCancelButton: true,
      focusCancel: true,
      confirmButtonText: "Save",
      cancelButtonText: "Cancel",
      reverseButtons: reverseSwalButtons,
      showClass: {
        popup: "animate__animated animate__fadeInDown animate__faster",
      },
      hideClass: {
        popup: "animate__animated animate__fadeOutUp animate__faster",
      },
      didOpen: () => {
        $(".swal2-input").attr("id", "rename-folder-input");
        $(".swal2-confirm").attr("id", "rename-folder-button");
        $("#rename-folder-input").keyup(function () {
          var val = $("#rename-folder-input").val();
          for (var char of nonAllowedCharacters) {
            if (val.includes(char)) {
              Swal.showValidationMessage(
                `The folder name cannot contains the following characters ${nonAllowedCharacters}, please rename to a different name!`
              );
              $("#rename-folder-button").attr("disabled", true);
              return;
            }
            $("#rename-folder-button").attr("disabled", false);
          }
        });
      },
      didDestroy: () => {
        $(".swal2-confirm").attr("id", "");
        $(".swal2-input").attr("id", "");
      },
    }).then((result) => {
      if (result.isConfirmed) {
        var returnedName = checkValidRenameInput(
          event1,
          result.value.trim(),
          type,
          currentName,
          newName,
          itemElement
          // myBootboxDialog
        );
        if (returnedName !== "") {
          Swal.fire({
            icon: "success",
            text: "Successfully renamed!.",
            heightAuto: false,
            backdrop: "rgba(0,0,0, 0.4)",
            showClass: {
              popup: "animate__animated animate__fadeInDown animate__faster",
            },
            hideClass: {
              popup: "animate__animated animate__fadeOutUp animate__faster",
            },
          });

          /// assign new name to folder or file in the UI
          event1.parentElement.parentElement.innerText = returnedName;
          /// get location of current file or folder in JSON obj
          var filtered = getGlobalPath(organizeCurrentLocation);
          var myPath = getRecursivePath(filtered.slice(1), inputGlobal);
          /// update jsonObjGlobal with the new name
          storedValue = myPath[type][currentName];
          delete myPath[type][currentName];
          myPath[type][returnedName] = storedValue;
          if ("action" in myPath[type][returnedName]) {
            if (!myPath[type][returnedName]["action"].includes("renamed")) {
              myPath[type][returnedName]["action"].push("renamed");
            }
          } else {
            myPath[type][returnedName]["action"] = [];
            myPath[type][returnedName]["action"].push("renamed");
          }
          /// list items again with updated JSON obj
          listItems(myPath, uiItem);
          getInFolder(
            singleUIItem,
            uiItem,
            organizeCurrentLocation,
            inputGlobal
          );
        }
      }
    });
  }
}

function getGlobalPath(path) {
  var currentPath = path.value.trim();
  var jsonPathArray = currentPath.split("/");
  var filtered = jsonPathArray.filter(function (el) {
    return el != "";
  });
  return filtered;
}

function loadFileFolder(myPath) {
  var appendString = "";
  var sortedObj = sortObjByKeys(myPath);

  for (var item in sortedObj["folders"]) {
    var emptyFolder = "";
    if (!highLevelFolders.includes(item)) {
      if (
        JSON.stringify(sortedObj["folders"][item]["folders"]) === "{}" &&
        JSON.stringify(sortedObj["folders"][item]["files"]) === "{}"
      ) {
        emptyFolder = " empty";
      }
    }
    appendString =
      appendString +
      '<div class="single-item" onmouseover="hoverForFullName(this)" onmouseleave="hideFullName()"><h1 oncontextmenu="folderContextMenu(this)" class="myFol' +
      emptyFolder +
      '"></h1><div class="folder_desc">' +
      item +
      "</div></div>";
  }
  for (var item in sortedObj["files"]) {
    // not the auto-generated manifest
    if (sortedObj["files"][item].length !== 1) {
      if ("path" in sortedObj["files"][item]) {
        var extension = path.extname(sortedObj["files"][item]["path"]);
        extension = extension.slice(1);
      } else {
        var extension = "other";
      }
      if (
        ![
          "docx",
          "doc",
          "pdf",
          "txt",
          "jpg",
          "JPG",
          "jpeg",
          "JPEG",
          "xlsx",
          "xls",
          "csv",
          "png",
          "PNG",
        ].includes(extension)
      ) {
        extension = "other";
      }
    } else {
      extension = "other";
    }
    appendString =
      appendString +
      '<div class="single-item" onmouseover="hoverForFullName(this)" onmouseleave="hideFullName()"><h1 class="myFile ' +
      extension +
      '" oncontextmenu="fileContextMenu(this)" style="margin-bottom: 10px""></h1><div class="folder_desc">' +
      item +
      "</div></div>";
  }

  return appendString;
}

function getRecursivePath(filteredList, inputObj) {
  var myPath = inputObj;
  for (var item of filteredList) {
    if (item.trim() !== "") {
      myPath = myPath["folders"][item];
    }
  }
  return myPath;
}

/// check if an array contains another array
function checkSubArrayBool(parentArray, childArray) {
  var bool = true;
  for (var element of childArray) {
    if (!parentArray.includes(element)) {
      bool = false;
      break;
    }
  }
  return bool;
}

function showItemsAsListBootbox(arrayOfItems) {
  var htmlElement = "";
  let i = 0;
  for (var element of arrayOfItems) {
    htmlElement =
      htmlElement +
      "<li style='font-size: large; margin-bottom: 5px; margin-right: 80px; margin-left: 80px;'>" +
      element +
      "</li>";
  }
  return htmlElement;
}

function selectAll(source) {
  let container = document.getElementById("container");
  let checkboxes = container.querySelectorAll("input[type=checkbox]");

  for (let i = 0; i < checkboxes.length; i++) {
    checkboxes[i].checked = source.checked;
  }
}

function onBtnClicked(btnId, duplicateArray) {
  Swal.close();
  //creates the html for sweetalert
  function createHTML(btnId, list) {
    if (btnId === "replace" || btnId === "skip") {
      type = "checkbox";
    } else if (btnId === "rename") {
      type = "text";
    }
    var tempFile = [];
    for (let i = 0; i < list.length; i++) {
      let lastSlash = list[i].lastIndexOf("\\") + 1;
      let fieldContainer = document.createElement("div");
      if (lastSlash === 0) {
        //in case it's on mac
        lastSlash = list[i].lastIndexOf("/") + 1;
      }
      //removes [ ] at end of string when passed through as JSON.stringify
      tempFile[i] = list[i].substring(lastSlash, list[i].length);

      let para = document.createElement("p");
      var extIndex = tempFile[i].lastIndexOf(".");
      var justFileName = tempFile[i].substring(0, extIndex);
      let input = document.createElement("input");
      let text = document.createTextNode(tempFile[i]);

      input.type = type;
      input.setAttribute("required", "");

      input.id = tempFile[i];
      input.placeholder = justFileName;
      para.style = "margin: 0; margin: 10px;";
      para.className = "input-name";
      container.id = "container";

      if (type === "checkbox") {
        input.className = "checkbox-design";
        input.name = "checkbox";
        fieldContainer.className = "checkbox-container";

        para.append(text);
        fieldContainer.append(para);
        fieldContainer.appendChild(input);
        container.append(fieldContainer);
        selectAll.append(container);
      } else if (type === "text") {
        input.className = "input-field-design";
        fieldContainer.className = "input-container";

        para.append(text);
        fieldContainer.append(para);
        text = document.createTextNode(":");
        para.append(text);
        fieldContainer.appendChild(input);
        container.append(fieldContainer);
      }
    }
    return tempFile;
  }

  //SKIP OPTION
  if (btnId === "skip") {
    console.log(duplicateArray);
    var tempFile = [];
    var temp = duplicateArray.substring(1, duplicateArray.length - 1);
    temp = temp.split(",");
    container = document.createElement("div");
    var selectAll = document.createElement("div");
    var selectText = document.createTextNode("Select All");
    var para2 = document.createElement("p");
    let selectAllCheckbox = document.createElement("input");

    para2.id = "selectAll";
    para2.className = "selectAll-container";
    selectAllCheckbox.setAttribute("onclick", "selectAll(this);");
    selectAllCheckbox.type = "checkbox";
    selectAllCheckbox.className = "checkbox-design selectAll-checkbox";

    para2.append(selectText);
    para2.append(selectAllCheckbox);
    selectAll.append(para2);
    selectAll.append(container);

    createHTML(btnId, temp);

    Swal.fire({
      title: "Select which files to skip",
      html: selectAll,
    }).then((result) => {
      if (result.isConfirmed) {
        let container = document.getElementById("container");
        let checkboxes = container.querySelectorAll(
          "input[type=checkbox]:checked"
        );
        var fileName = [];
        var newList = [];
        //remove slashes and place just file name in new array
        for (let i = 0; i < temp.length; i++) {
          let lastSlash = temp[i].lastIndexOf("\\") + 1;
          if (lastSlash === 0) {
            lastSlash = temp[i].lastIndexOf("/") + 1;
          }
          fileName.push(temp[i].substring(lastSlash, temp[i].length));
        }
        //go through just file names and compare to select checkboxes
        //remove the unchecked names from the array
        for (let i = 0; i < checkboxes.length; i++) {
          if (fileName.includes(checkboxes[i].id)) {
            let index = fileName.indexOf(checkboxes[i].id);
            console.log(index);
            fileName.splice(index, 1);
          }
        }
        //now compare filenames with original array containing the paths
        for (let i = 0; i < temp.length; i++) {
          let lastSlash = temp[i].lastIndexOf("\\") + 1;
          if (lastSlash === 0) {
            lastSlash = temp[i].lastIndexOf("/") + 1;
          }
          if (fileName.includes(temp[i].substring(lastSlash, temp[i].length))) {
            newList.push(temp[i]);
          }
        }
      }

      var listElements = showItemsAsListBootbox(fileName);
      newList = JSON.stringify(newList).replace(/"/g, "");
      if (fileName.length > 0) {
        Swal.fire({
          title: "Duplicate file(s) detected",
          icon: "warning",
          showConfirmButton: false,
          allowOutsideClick: false,
          showCloseButton: true,
          customClass: "wide-swal-auto",
          backdrop: "rgba(0, 0, 0, 0.4)",
          showClass: {
            popup: "animate__animated animate__zoomIn animate__faster",
          },
          hideClass: {
            popup: "animate_animated animate_zoomout animate__faster",
          },
          html:
            `
          <div class="caption">
            <p>Files with the following names are already in the current folder: <p><ul>${listElements}</ul></p></p>
          </div>  
          <div class="button-container">
            <button id="skip" class="btn skip-btn" onclick="onBtnClicked('skip', '` +
            newList +
            `')">Skip Files</button>
            <button id="replace" class="btn replace-btn" onclick="onBtnClicked('replace', '` +
            newList +
            `')">Replace Existing Files</button>
            <button id="rename" class="btn rename-btn" onclick="onBtnClicked('rename', '` +
            newList +
            `')">Import Duplicates</button>
            <button id="cancel" class="btn cancel-btn" onclick="onBtnClicked('cancel')">Cancel</button>
            </div>`,
        });
      }
    });
  }

  //RENAME OPTION
  if (btnId === "rename") {
    var filtered = getGlobalPath(organizeDSglobalPath);
    var myPath = getRecursivePath(filtered.slice(1), datasetStructureJSONObj);
    var temp = "";
    if (duplicateArray.substring(0, 1) === "[") {
      temp = duplicateArray.substring(1, duplicateArray.length - 1);
    } else {
      temp = duplicateArray.substring(0, duplicateArray.length);
    }
    temp = temp.split(",");
    container = document.createElement("div");

    var tempFile = createHTML(btnId, temp);

    swal
      .fire({
        title: "Rename Files",
        confirmButtonText: "Save",
        allowOutsideClick: false,
        heightAuto: false,
        customClass: "wide-swal",
        showCloseButton: true,
        backdrop: "rgba(0, 0, 0, 0.4)",
        showClass: {
          popup: "animate__animated animate__zoomIn animate__faster",
        },
        hideClass: {
          popup: "animate_animated animate_zoomout animate__faster",
        },
        html: container,
        didOpen: () => {
          firstinput = tempFile[0];
          $(firstinput).focus();
        },
        preConfirm: () => {
          //check the same name isn't being used
          console.log(myPath);
          var reNamedFiles = [];
          var fileLocation = [];
          sameName = [];
          for (var i = 0; i < tempFile.length; i++) {
            let inputField = tempFile[i];
            document.getElementById(inputField).style.borderColor = "";
            extIndex = tempFile[i].lastIndexOf(".");
            justFileName = tempFile[i].substring(0, extIndex);
            let newName = document.getElementById(inputField).value;
            console.log(
              newName.concat(
                tempFile[i].substring(extIndex, tempFile[i].length)
              )
            );
            if (
              myPath["files"].hasOwnProperty(
                newName.concat(
                  tempFile[i].substring(extIndex, tempFile[i].length)
                )
              )
            ) {
              document.getElementById(inputField).style.borderColor = "red";
              document.getElementById(inputField).value = "";
              document.getElementById(inputField).placeholder =
                "Provide a new name";
              console.log("they are the same");
              sameName.push(true);
            } else {
              sameName.push(false);
            }
            if (justFileName === newName || newName === "") {
              document.getElementById(inputField).style.borderColor = "red";
              document.getElementById(inputField).value = "";
              document.getElementById(inputField).placeholder =
                "Provide a new name";
              console.log("they are the same");
              sameName.push(true);
            } else {
              sameName.push(false);
            }
            if (
              justFileName != newName &&
              newName != "" &&
              reNamedFiles.includes(newName) === false
            ) {
              reNamedFiles.push(
                newName.concat(
                  tempFile[i].substring(extIndex, tempFile[i].length)
                )
              );
              fileLocation.push(temp[i]);
            }
          }
          console.log(reNamedFiles);
          console.log(fileLocation);
          console.log(sameName.includes(true) === true);
          if (sameName.includes(true) === true) {
            sameName = [];
            i = 0;
            return false;
            $("swal2-confirm swal2-styled").removeAttr("disabled");
          } else {
            console.log("SUCCESS");
            //add files to json and ui

            for (let index = 0; index < temp.length; index++) {
              myPath["files"][reNamedFiles[index]] = {
                path: fileLocation[index],
                basename: reNamedFiles[index],
                type: "local",
                description: "",
                "additional-metadata": "",
                action: ["new", "renamed"],
              };
              var appendString =
                '<div class="single-item" onmouseover="hoverForFullName(this)" onmouseleave="hideFullName()"><h1 class="folder file"><i class="far fa-file-alt"  oncontextmenu="fileContextMenu(this)"  style="margin-bottom:10px"></i></h1><div class="folder_desc">' +
                myPath["files"][reNamedFiles[index]]["basename"] +
                "</div></div>";

              $("#items").html(appendString);
              listItems(myPath, "#items");
              getInFolder(
                "#items",
                "#items",
                organizeDSglobalPath,
                datasetStructureJSONObj
              );
            }
          }
        },
      })
      .then((result) => {
        if (result.isConfirmed) {
          Swal.fire("Succesfully imported and renamed!", "", "success");
        }
      });
  }
  if (btnId === "replace") {
    //new prompt with list of files and input fields to rename files
    //if left blank prompt with a list of the blank asking if want to skip files or replace old files
    console.log("replace");
    var filtered = getGlobalPath(organizeDSglobalPath);
    var myPath = getRecursivePath(filtered.slice(1), datasetStructureJSONObj);
    var tempFile = [];
    var temp = duplicateArray.substring(1, duplicateArray.length - 1);
    temp = temp.split(",");
    var container = document.createElement("div");
    var selectAll = document.createElement("div");
    var selectText = document.createTextNode("Select All");
    var para2 = document.createElement("p");
    let selectAllCheckbox = document.createElement("input");

    para2.className = "selectAll-text";
    selectAllCheckbox.setAttribute("onclick", "selectAll(this);");
    selectAllCheckbox.type = "checkbox";
    selectAllCheckbox.className = "checkbox-design";

    para2.append(selectText);
    para2.append(selectAllCheckbox);
    selectAll.append(para2);
    selectAll.append(container);

    //loop through paths and get file name
    var tempFile = createHTML(btnId, temp);
    console.log(tempFile);
    var nodes = document.getElementsByClassName("folder_desc");
    Swal.fire({
      title: "Select which files to replace",
      html: selectAll,
    }).then((result) => {
      if (result.isConfirmed) {
        let container = document.getElementById("container");
        let checkboxes = container.querySelectorAll(
          "input[type=checkbox]:checked"
        );
        var fileCheck = [];
        for (let i = 0; i < temp.length; i++) {
          let lastSlash = temp[i].lastIndexOf("\\") + 1;
          if (lastSlash === 0) {
            lastSlash = temp[i].lastIndexOf("/") + 1;
          }
          fileCheck.push(temp[i].substring(lastSlash, temp[i].length));
        }
        for (let i = 0; i < checkboxes.length; i++) {
          console.log(checkboxes[i].id);
          let removeExt = checkboxes[i].id.lastIndexOf(".");
          let justName = checkboxes[i].id.substring(0, removeExt);
          let ext = checkboxes[i].id.substring(
            removeExt,
            checkboxes[i].id.length
          );
          let index = fileCheck.indexOf(checkboxes[i].id);
          let fileName = checkboxes[i].id;
          delete myPath["files"][fileName];
          myPath["files"][justName + ext] = {
            path: temp[index],
            basename: fileName,
            type: "local",
            description: "",
            "additional-metadata": "",
            action: ["new", "updated"],
          };
          console.log(nodes);
          for (let j = 0; j < nodes.length; j++) {
            if (nodes[j].innerText === fileName) {
              console.log(nodes[j].parentNode);
              nodes[j].parentNode.remove();
            }
          }

          console.log($("#items"));
          listItems(myPath, "#items");
          getInFolder(
            "#items",
            "#items",
            organizeDSglobalPath,
            datasetStructureJSONObj
          );
        }
      }
    });
    //then handle the selected checkboxes
  }
}

function addFilesfunction(
  fileArray,
  currentLocation,
  organizeCurrentLocation,
  uiItem,
  singleUIItem,
  globalPathValue
) {
  // check for duplicate or files with the same name
  var nonAllowedDuplicateFiles = [];
  var regularFiles = {};
  var uiFilesWithoutExtension = {};

  for (var file in currentLocation["files"]) {
    uiFilesWithoutExtension[path.parse(file).base] = 1;
    //use uiFilesWithoutExtension to compare names
    //if names and path are the same it is nonallowed
    //if just name is the same
  }
  //gets files already placed and puts into json

  for (var i = 0; i < fileArray.length; i++) {
    var fileName = fileArray[i];
    // check if dataset structure level is at high level folder
    var slashCount = organizeDSglobalPath.value.trim().split("/").length - 1;
    if (slashCount === 1) {
      Swal.fire({
        icon: "error",
        html: "<p>This interface is only for including files in the SPARC folders. If you are trying to add SPARC metadata file(s), you can do so in the next Step.</p>",
        heightAuto: false,
        backdrop: "rgba(0,0,0, 0.4)",
      });
      break;
    } else {
      if (
        JSON.stringify(currentLocation["files"]) === "{}" &&
        JSON.stringify(regularFiles) === "{}"
      ) {
        //regular files object key with path, and basename
        regularFiles[path.parse(fileName).base] = {
          path: fileName,
          basename: path.parse(fileName).base,
        };
      } else {
        for (var objectKey in currentLocation["files"]) {
          //tries finding duplicates with the same path
          if (objectKey !== undefined) {
            var nonAllowedDuplicate = false;
            //if file already exist in json
            if (fileName === currentLocation["files"][objectKey]["path"]) {
              nonAllowedDuplicateFiles.push(fileName);
              nonAllowedDuplicate = true;
              break;
            }
          }
        }

        if (!nonAllowedDuplicate) {
          //there was a duplicate with the same name but different path
          //prompt user if they want to allow duplicate
          var j = 1;
          var fileBaseName = path.basename(fileName);
          var originalFileNameWithoutExt = path.parse(fileBaseName).name;
          var fileNameWithoutExt = originalFileNameWithoutExt;

          while (
            fileBaseName in uiFilesWithoutExtension ||
            fileBaseName in regularFiles
          ) {
            fileNameWithoutExt = `${originalFileNameWithoutExt} (${j})`;
            fileBaseName = fileNameWithoutExt + path.parse(fileBaseName).ext;
            j++;
          }
          regularFiles[fileBaseName] = {
            path: fileName,
            basename: fileBaseName,
          };
        }
      }
    }
  }

  // now handle non-allowed duplicates (show message), allowed duplicates (number duplicates & append to UI),
  // and regular files (append to UI)
  if (Object.keys(regularFiles).length > 0) {
    for (var element in regularFiles) {
      currentLocation["files"][regularFiles[element]["basename"]] = {
        path: regularFiles[element]["path"],
        type: "local",
        description: "",
        "additional-metadata": "",
        action: ["new"],
      };
      // append "renamed" to "action" key if file is auto-renamed by UI
      var originalName = path.parse(
        currentLocation["files"][regularFiles[element]["basename"]]["path"]
      ).base;
      if (element !== originalName) {
        currentLocation["files"][regularFiles[element]["basename"]][
          "action"
        ].push("renamed");
      }
      var appendString =
        '<div class="single-item" onmouseover="hoverForFullName(this)" onmouseleave="hideFullName()"><h1 class="folder file"><i class="far fa-file-alt"  oncontextmenu="fileContextMenu(this)"  style="margin-bottom:10px"></i></h1><div class="folder_desc">' +
        regularFiles[element]["basename"] +
        "</div></div>";
      $(uiItem).html(appendString);
      listItems(currentLocation, uiItem);
      getInFolder(
        singleUIItem,
        uiItem,
        organizeCurrentLocation,
        globalPathValue
      );
    }
  }
  //add sweetalert here before non duplicate files pop
  //
  //if (AllowedDuplicateFiles.length > 0) {
  //}
  var test = [];
  for (let element in nonAllowedDuplicateFiles) {
    let lastSlash = nonAllowedDuplicateFiles[element].lastIndexOf("\\") + 1;
    if (lastSlash === 0) {
      lastSlash = nonAllowedDuplicateFiles[element].lastIndexOf("/") + 1;
    }
    test.push(
      nonAllowedDuplicateFiles[element].substring(
        lastSlash,
        nonAllowedDuplicateFiles[element].length
      )
    );
  }
  var list = JSON.stringify(nonAllowedDuplicateFiles).replace(/"/g, "");

  //alert giving a list of files + path that cannot be copied bc theyre duplicates
  var listElements = showItemsAsListBootbox(test);
  if (nonAllowedDuplicateFiles.length > 0) {
    Swal.fire({
      title: "Duplicate file(s) detected",
      icon: "warning",
      showConfirmButton: false,
      allowOutsideClick: false,
      showCloseButton: true,
      customClass: "wide-swal-auto",
      backdrop: "rgba(0, 0, 0, 0.4)",
      showClass: {
        popup: "animate__animated animate__zoomIn animate__faster",
      },
      hideClass: {
        popup: "animate_animated animate_zoomout animate__faster",
      },
      html:
        `
      <div class="caption">
        <p>Files with the following names are already in the current folder: <p><ul>${listElements}</ul></p></p>
      </div>  
      <div class="button-container">
        <button id="skip" class="btn skip-btn" onclick="onBtnClicked('skip', '` +
        list +
        `')">Skip Files</button>
        <button id="replace" class="btn replace-btn" onclick="onBtnClicked('replace', '${list}')">Replace Existing Files</button>
        <button id="rename" class="btn rename-btn" onclick="onBtnClicked('rename', '${list}')">Import Duplicates</button>
        <button id="cancel" class="btn cancel-btn" onclick="onBtnClicked('cancel')">Cancel</button>
        </div>`,
    });
  }
}

///// function to load details to show in display once
///// users click Show details
function loadDetailsContextMenu(
  fileName,
  filePath,
  textareaID1,
  textareaID2,
  paraLocalPath
) {
  if ("description" in filePath["files"][fileName]) {
    document.getElementById(textareaID1).value =
      filePath["files"][fileName]["description"];
  } else {
    document.getElementById(textareaID1).value = "";
  }
  if ("additional-metadata" in filePath["files"][fileName]) {
    document.getElementById(textareaID2).value =
      filePath["files"][fileName]["additional-metadata"];
  } else {
    document.getElementById(textareaID2).value = "";
  }
  path_label = document.querySelector(
    "#organize-dataset-tab > div > div > div > div.div-display-details.file > div:nth-child(2) > label"
  );
  if (filePath["files"][fileName]["type"] === "bf") {
    path_label.innerHTML = "<b>Pennsieve path:<br></b>";
    bf_path = "";
    filePath["files"][fileName]["bfpath"].forEach(
      (item) => (bf_path += item + "/")
    );
    bf_path += fileName;
    document.getElementById(paraLocalPath).innerHTML = bf_path;
  } else {
    path_label.innerHTML = "<b>Local path:<br></b>";
    document.getElementById(paraLocalPath).innerHTML =
      filePath["files"][fileName]["path"];
  }
}

//path_label = document.querySelector("#organize-dataset-tab > div > div > div > div.div-display-details.file > div:nth-child(2) > label");

function triggerManageDetailsPrompts(
  ev,
  fileName,
  filePath,
  textareaID1,
  textareaID2
) {
  filePath["files"][fileName]["additional-metadata"] = document
    .getElementById(textareaID2)
    .value.trim();
  filePath["files"][fileName]["description"] = document
    .getElementById(textareaID1)
    .value.trim();
  // check for "Apply to all files"
  if (document.getElementById("input-add-file-metadata").checked) {
    for (var file in filePath["files"]) {
      filePath["files"][file]["additional-metadata"] = document
        .getElementById(textareaID2)
        .value.trim();
    }
  }
  if (document.getElementById("input-add-file-description").checked) {
    for (var file in filePath["files"]) {
      filePath["files"][file]["description"] = document
        .getElementById(textareaID1)
        .value.trim();
    }
  }
  // $(this).html("Done <i class='fas fa-check'></i>");
}

// on change event (in this case: NextBtn click from Step 2 - Step 3)
// 1. Check path: if path === "My_dataset_folder", then hideOrganizeButtons(), otherwise, showOrganizeButtons()
// 2. How to show/hide Organize buttons:
//    a. Hide: display: none (New folder, Import, Back button, and path)
//    b. Show: display: flex (New folder, Import, Back button, and path) + Center the items
function organizeLandingUIEffect() {
  if ($("#input-global-path").val() === "My_dataset_folder/") {
    $(".div-organize-dataset-menu").css("visibility", "hidden");
    $("#organize-path-and-back-button-div").css("visibility", "hidden");
  } else {
    $("#organize-path-and-back-button-div").css("visibility", "visible");
    $(".div-organize-dataset-menu").css("visibility", "visible");
  }
}
